package usuario

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Handler struct {
	DB *sql.DB
}

type Usuario struct {
	ID               int64  `json:"id"`
	StrNombreUsuario string `json:"strNombreUsuario"`
	IDPerfil         int64  `json:"idPerfil"`
	PerfilNombre     string `json:"perfilNombre,omitempty"`
	StrPwd           string `json:"strPwd,omitempty"`
	IDEstadoUsuario  int    `json:"idEstadoUsuario"`
	EstadoNombre     string `json:"estadoNombre,omitempty"`
	StrCorreo        string `json:"strCorreo"`
	StrNumeroCelular string `json:"strNumeroCelular"`
	StrImagenUsuario string `json:"strImagenUsuario"`
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.List(w, r)
	case http.MethodPost:
		h.Create(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"message": "Método no permitido"})
	}
}

func (h *Handler) HandleByID(w http.ResponseWriter, r *http.Request) {
	id, err := getIDFromPath(r.URL.Path, "/api/usuarios/")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "ID inválido"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetByID(w, id)
	case http.MethodPut:
		h.Update(w, r, id)
	case http.MethodDelete:
		h.Delete(w, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"message": "Método no permitido"})
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := getLimitOffset(r)

	var total int
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM usuario`).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error contando usuarios"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT
			u.id,
			u.str_nombre_usuario,
			u.id_perfil,
			p.str_nombre_perfil,
			u.id_estado_usuario,
			eu.str_nombre,
			u.str_correo,
			COALESCE(u.str_numero_celular, ''),
			COALESCE(u.str_imagen_usuario, '')
		FROM usuario u
		INNER JOIN perfil p ON p.id = u.id_perfil
		INNER JOIN estado_usuario eu ON eu.id = u.id_estado_usuario
		ORDER BY u.id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error listando usuarios"})
		return
	}
	defer rows.Close()

	result := []Usuario{}
	for rows.Next() {
		var u Usuario
		if err := rows.Scan(
			&u.ID,
			&u.StrNombreUsuario,
			&u.IDPerfil,
			&u.PerfilNombre,
			&u.IDEstadoUsuario,
			&u.EstadoNombre,
			&u.StrCorreo,
			&u.StrNumeroCelular,
			&u.StrImagenUsuario,
		); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error leyendo usuarios"})
			return
		}
		result = append(result, u)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"rows":       result,
		"total":      total,
		"totalPages": calcTotalPages(total, limit),
	})
}

func (h *Handler) GetByID(w http.ResponseWriter, id int64) {
	var u Usuario
	err := h.DB.QueryRow(`
		SELECT
			u.id,
			u.str_nombre_usuario,
			u.id_perfil,
			p.str_nombre_perfil,
			u.id_estado_usuario,
			eu.str_nombre,
			u.str_correo,
			COALESCE(u.str_numero_celular, ''),
			COALESCE(u.str_imagen_usuario, '')
		FROM usuario u
		INNER JOIN perfil p ON p.id = u.id_perfil
		INNER JOIN estado_usuario eu ON eu.id = u.id_estado_usuario
		WHERE u.id = $1
	`, id).Scan(
		&u.ID,
		&u.StrNombreUsuario,
		&u.IDPerfil,
		&u.PerfilNombre,
		&u.IDEstadoUsuario,
		&u.EstadoNombre,
		&u.StrCorreo,
		&u.StrNumeroCelular,
		&u.StrImagenUsuario,
	)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Usuario no encontrado"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error obteniendo usuario"})
		return
	}

	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "Formulario inválido"})
		return
	}

	u, err := parseUsuarioForm(r, false)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
		return
	}

	imagePath, err := saveUploadedImage(r, "imagenUsuario")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
		return
	}
	u.StrImagenUsuario = imagePath

	err = h.DB.QueryRow(`
		INSERT INTO usuario (
			str_nombre_usuario,
			id_perfil,
			str_pwd,
			id_estado_usuario,
			str_correo,
			str_numero_celular,
			str_imagen_usuario
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`,
		u.StrNombreUsuario,
		u.IDPerfil,
		u.StrPwd,
		u.IDEstadoUsuario,
		u.StrCorreo,
		u.StrNumeroCelular,
		nullIfEmpty(u.StrImagenUsuario),
	).Scan(&u.ID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error creando usuario"})
		return
	}

	writeJSON(w, http.StatusCreated, u)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request, id int64) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "Formulario inválido"})
		return
	}

	currentImage := ""
	_ = h.DB.QueryRow(`SELECT COALESCE(str_imagen_usuario, '') FROM usuario WHERE id = $1`, id).Scan(&currentImage)

	u, err := parseUsuarioForm(r, true)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
		return
	}

	imagePath, err := saveUploadedImage(r, "imagenUsuario")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
		return
	}
	if imagePath == "" {
		imagePath = currentImage
	}
	u.StrImagenUsuario = imagePath

	if strings.TrimSpace(u.StrPwd) == "" {
		res, err := h.DB.Exec(`
			UPDATE usuario
			SET
				str_nombre_usuario = $1,
				id_perfil = $2,
				id_estado_usuario = $3,
				str_correo = $4,
				str_numero_celular = $5,
				str_imagen_usuario = $6
			WHERE id = $7
		`,
			u.StrNombreUsuario,
			u.IDPerfil,
			u.IDEstadoUsuario,
			u.StrCorreo,
			u.StrNumeroCelular,
			nullIfEmpty(u.StrImagenUsuario),
			id,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error actualizando usuario"})
			return
		}
		affected, _ := res.RowsAffected()
		if affected == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"message": "Usuario no encontrado"})
			return
		}
	} else {
		res, err := h.DB.Exec(`
			UPDATE usuario
			SET
				str_nombre_usuario = $1,
				id_perfil = $2,
				str_pwd = $3,
				id_estado_usuario = $4,
				str_correo = $5,
				str_numero_celular = $6,
				str_imagen_usuario = $7
			WHERE id = $8
		`,
			u.StrNombreUsuario,
			u.IDPerfil,
			u.StrPwd,
			u.IDEstadoUsuario,
			u.StrCorreo,
			u.StrNumeroCelular,
			nullIfEmpty(u.StrImagenUsuario),
			id,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error actualizando usuario"})
			return
		}
		affected, _ := res.RowsAffected()
		if affected == 0 {
			writeJSON(w, http.StatusNotFound, map[string]any{"message": "Usuario no encontrado"})
			return
		}
	}

	u.ID = id
	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) Delete(w http.ResponseWriter, id int64) {
	res, err := h.DB.Exec(`DELETE FROM usuario WHERE id = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error eliminando usuario"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Usuario no encontrado"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "Usuario eliminado"})
}

func parseUsuarioForm(r *http.Request, isUpdate bool) (Usuario, error) {
	var u Usuario
	var err error

	u.StrNombreUsuario = strings.TrimSpace(r.FormValue("strNombreUsuario"))
	u.StrPwd = strings.TrimSpace(r.FormValue("strPwd"))
	u.StrCorreo = strings.TrimSpace(r.FormValue("strCorreo"))
	u.StrNumeroCelular = strings.TrimSpace(r.FormValue("strNumeroCelular"))

	if u.StrNombreUsuario == "" {
		return u, fmt.Errorf("el nombre de usuario es obligatorio")
	}
	if u.StrCorreo == "" || !strings.Contains(u.StrCorreo, "@") {
		return u, fmt.Errorf("correo inválido")
	}
	if u.StrNumeroCelular == "" {
		return u, fmt.Errorf("el número celular es obligatorio")
	}

	u.IDPerfil, err = parseInt64Field(r.FormValue("idPerfil"), "perfil inválido")
	if err != nil {
		return u, err
	}

	estadoTmp, err := parseIntField(r.FormValue("idEstadoUsuario"), "estado inválido")
	if err != nil {
		return u, err
	}
	u.IDEstadoUsuario = estadoTmp

	if !isUpdate && u.StrPwd == "" {
		return u, fmt.Errorf("la contraseña es obligatoria")
	}

	return u, nil
}

func saveUploadedImage(r *http.Request, fieldName string) (string, error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		if err == http.ErrMissingFile {
			return "", nil
		}
		return "", fmt.Errorf("error procesando imagen")
	}
	defer file.Close()

	if err := os.MkdirAll("uploads/usuarios", os.ModePerm); err != nil {
		return "", fmt.Errorf("no se pudo crear carpeta uploads")
	}

	filename := buildFileName(header)
	fullPath := filepath.Join("uploads", "usuarios", filename)

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("no se pudo guardar imagen")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("no se pudo copiar imagen")
	}

	return "/" + filepath.ToSlash(fullPath), nil
}

func buildFileName(header *multipart.FileHeader) string {
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png"
	}
	return fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
}

func nullIfEmpty(v string) any {
	if strings.TrimSpace(v) == "" {
		return nil
	}
	return v
}

func parseInt64Field(value, msg string) (int64, error) {
	n, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0, fmt.Errorf(msg)
	}
	return n, nil
}

func parseIntField(value, msg string) (int, error) {
	n, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil {
		return 0, fmt.Errorf(msg)
	}
	return n, nil
}

func getIDFromPath(path, prefix string) (int64, error) {
	idStr := strings.TrimPrefix(path, prefix)
	return strconv.ParseInt(idStr, 10, 64)
}

func getLimitOffset(r *http.Request) (int, int) {
	limit := 5
	offset := 0

	if v := r.URL.Query().Get("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	return limit, offset
}

func calcTotalPages(total, limit int) int {
	if limit <= 0 {
		return 1
	}
	if total == 0 {
		return 1
	}
	pages := total / limit
	if total%limit != 0 {
		pages++
	}
	return pages
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}