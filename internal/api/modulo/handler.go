package modulo

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

type Modulo struct {
	ID              int64  `json:"id"`
	StrNombreModulo string `json:"strNombreModulo"`
	StrClaveModulo  string `json:"strClaveModulo"`
	StrRuta         string `json:"strRuta"`
	BitEstatico     bool   `json:"bitEstatico"`
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
	id, err := getIDFromPath(r.URL.Path, "/api/modulos/")
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
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM modulo`).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error contando módulos"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, str_nombre_modulo, str_clave_modulo, str_ruta, bit_estatico
		FROM modulo
		ORDER BY id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error listando módulos"})
		return
	}
	defer rows.Close()

	result := []Modulo{}
	for rows.Next() {
		var m Modulo
		if err := rows.Scan(&m.ID, &m.StrNombreModulo, &m.StrClaveModulo, &m.StrRuta, &m.BitEstatico); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error leyendo módulos"})
			return
		}
		result = append(result, m)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"rows":       result,
		"total":      total,
		"totalPages": calcTotalPages(total, limit),
	})
}

func (h *Handler) GetByID(w http.ResponseWriter, id int64) {
	var m Modulo
	err := h.DB.QueryRow(`
		SELECT id, str_nombre_modulo, str_clave_modulo, str_ruta, bit_estatico
		FROM modulo
		WHERE id = $1
	`, id).Scan(&m.ID, &m.StrNombreModulo, &m.StrClaveModulo, &m.StrRuta, &m.BitEstatico)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Módulo no encontrado"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error obteniendo módulo"})
		return
	}

	writeJSON(w, http.StatusOK, m)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var m Modulo
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	m.StrNombreModulo = strings.TrimSpace(m.StrNombreModulo)
	m.StrClaveModulo = strings.TrimSpace(m.StrClaveModulo)
	m.StrRuta = strings.TrimSpace(m.StrRuta)

	if m.StrNombreModulo == "" || m.StrClaveModulo == "" || m.StrRuta == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "Nombre, clave y ruta son obligatorios"})
		return
	}

	err := h.DB.QueryRow(`
		INSERT INTO modulo (str_nombre_modulo, str_clave_modulo, str_ruta, bit_estatico)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, m.StrNombreModulo, m.StrClaveModulo, m.StrRuta, m.BitEstatico).Scan(&m.ID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error creando módulo"})
		return
	}

	writeJSON(w, http.StatusCreated, m)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request, id int64) {
	var m Modulo
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	m.StrNombreModulo = strings.TrimSpace(m.StrNombreModulo)
	m.StrClaveModulo = strings.TrimSpace(m.StrClaveModulo)
	m.StrRuta = strings.TrimSpace(m.StrRuta)

	if m.StrNombreModulo == "" || m.StrClaveModulo == "" || m.StrRuta == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "Nombre, clave y ruta son obligatorios"})
		return
	}

	res, err := h.DB.Exec(`
		UPDATE modulo
		SET str_nombre_modulo = $1,
		    str_clave_modulo = $2,
		    str_ruta = $3,
		    bit_estatico = $4
		WHERE id = $5
	`, m.StrNombreModulo, m.StrClaveModulo, m.StrRuta, m.BitEstatico, id)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error actualizando módulo"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Módulo no encontrado"})
		return
	}

	m.ID = id
	writeJSON(w, http.StatusOK, m)
}

func (h *Handler) Delete(w http.ResponseWriter, id int64) {
	res, err := h.DB.Exec(`DELETE FROM modulo WHERE id = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error eliminando módulo"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Módulo no encontrado"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "Módulo eliminado"})
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
