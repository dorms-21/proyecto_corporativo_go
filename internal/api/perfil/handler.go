package perfil

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type Handler struct {
	DB *sql.DB
}

type Perfil struct {
	ID                int64  `json:"id"`
	StrNombrePerfil   string `json:"strNombrePerfil"`
	BitAdministrador  bool   `json:"bitAdministrador"`
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
	id, err := getIDFromPath(r.URL.Path, "/api/perfiles/")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "ID inválido"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.GetByID(w, r, id)
	case http.MethodPut:
		h.Update(w, r, id)
	case http.MethodDelete:
		h.Delete(w, r, id)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"message": "Método no permitido"})
	}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset := getLimitOffset(r)
	var total int
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM perfil`).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error contando perfiles"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, str_nombre_perfil, bit_administrador
		FROM perfil
		ORDER BY id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error listando perfiles"})
		return
	}
	defer rows.Close()

	result := []Perfil{}
	for rows.Next() {
		var p Perfil
		if err := rows.Scan(&p.ID, &p.StrNombrePerfil, &p.BitAdministrador); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error leyendo perfiles"})
			return
		}
		result = append(result, p)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"rows":       result,
		"total":      total,
		"totalPages": calcTotalPages(total, limit),
	})
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request, id int64) {
	var p Perfil
	err := h.DB.QueryRow(`
		SELECT id, str_nombre_perfil, bit_administrador
		FROM perfil
		WHERE id = $1
	`, id).Scan(&p.ID, &p.StrNombrePerfil, &p.BitAdministrador)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Perfil no encontrado"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error obteniendo perfil"})
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var p Perfil
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	p.StrNombrePerfil = strings.TrimSpace(p.StrNombrePerfil)
	if p.StrNombrePerfil == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "El nombre del perfil es obligatorio"})
		return
	}

	err := h.DB.QueryRow(`
		INSERT INTO perfil (str_nombre_perfil, bit_administrador)
		VALUES ($1, $2)
		RETURNING id
	`, p.StrNombrePerfil, p.BitAdministrador).Scan(&p.ID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error creando perfil"})
		return
	}

	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request, id int64) {
	var p Perfil
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	p.StrNombrePerfil = strings.TrimSpace(p.StrNombrePerfil)
	if p.StrNombrePerfil == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "El nombre del perfil es obligatorio"})
		return
	}

	res, err := h.DB.Exec(`
		UPDATE perfil
		SET str_nombre_perfil = $1, bit_administrador = $2
		WHERE id = $3
	`, p.StrNombrePerfil, p.BitAdministrador, id)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error actualizando perfil"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Perfil no encontrado"})
		return
	}

	p.ID = id
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request, id int64) {
	res, err := h.DB.Exec(`DELETE FROM perfil WHERE id = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error eliminando perfil"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Perfil no encontrado"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "Perfil eliminado"})
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