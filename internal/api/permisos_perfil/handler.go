package permisos_perfil

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

type PermisoPerfil struct {
	ID           int64  `json:"id"`
	IDModulo     int64  `json:"idModulo"`
	IDPerfil     int64  `json:"idPerfil"`
	PerfilNombre string `json:"perfilNombre,omitempty"`
	ModuloNombre string `json:"moduloNombre,omitempty"`
	BitAgregar   bool   `json:"bitAgregar"`
	BitEditar    bool   `json:"bitEditar"`
	BitConsulta  bool   `json:"bitConsulta"`
	BitEliminar  bool   `json:"bitEliminar"`
	BitDetalle   bool   `json:"bitDetalle"`
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
	id, err := getIDFromPath(r.URL.Path, "/api/permisos-perfil/")
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
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM permisos_perfil`).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error contando permisos"})
		return
	}

	rows, err := h.DB.Query(`
		SELECT
			pp.id,
			pp.id_modulo,
			pp.id_perfil,
			p.str_nombre_perfil,
			m.str_nombre_modulo,
			pp.bit_agregar,
			pp.bit_editar,
			pp.bit_consulta,
			pp.bit_eliminar,
			pp.bit_detalle
		FROM permisos_perfil pp
		INNER JOIN perfil p ON p.id = pp.id_perfil
		INNER JOIN modulo m ON m.id = pp.id_modulo
		ORDER BY pp.id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error listando permisos"})
		return
	}
	defer rows.Close()

	result := []PermisoPerfil{}
	for rows.Next() {
		var p PermisoPerfil
		if err := rows.Scan(
			&p.ID,
			&p.IDModulo,
			&p.IDPerfil,
			&p.PerfilNombre,
			&p.ModuloNombre,
			&p.BitAgregar,
			&p.BitEditar,
			&p.BitConsulta,
			&p.BitEliminar,
			&p.BitDetalle,
		); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error leyendo permisos"})
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

func (h *Handler) GetByID(w http.ResponseWriter, id int64) {
	var p PermisoPerfil
	err := h.DB.QueryRow(`
		SELECT
			pp.id,
			pp.id_modulo,
			pp.id_perfil,
			per.str_nombre_perfil,
			m.str_nombre_modulo,
			pp.bit_agregar,
			pp.bit_editar,
			pp.bit_consulta,
			pp.bit_eliminar,
			pp.bit_detalle
		FROM permisos_perfil pp
		INNER JOIN perfil per ON per.id = pp.id_perfil
		INNER JOIN modulo m ON m.id = pp.id_modulo
		WHERE pp.id = $1
	`, id).Scan(
		&p.ID,
		&p.IDModulo,
		&p.IDPerfil,
		&p.PerfilNombre,
		&p.ModuloNombre,
		&p.BitAgregar,
		&p.BitEditar,
		&p.BitConsulta,
		&p.BitEliminar,
		&p.BitDetalle,
	)

	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Permiso no encontrado"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error obteniendo permiso"})
		return
	}

	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var p PermisoPerfil
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	if p.IDPerfil <= 0 || p.IDModulo <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "Perfil y módulo son obligatorios"})
		return
	}

	err := h.DB.QueryRow(`
		INSERT INTO permisos_perfil (
			id_modulo,
			id_perfil,
			bit_agregar,
			bit_editar,
			bit_consulta,
			bit_eliminar,
			bit_detalle
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`,
		p.IDModulo,
		p.IDPerfil,
		p.BitAgregar,
		p.BitEditar,
		p.BitConsulta,
		p.BitEliminar,
		p.BitDetalle,
	).Scan(&p.ID)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error creando permiso"})
		return
	}

	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request, id int64) {
	var p PermisoPerfil
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "JSON inválido"})
		return
	}

	res, err := h.DB.Exec(`
		UPDATE permisos_perfil
		SET
			id_modulo = $1,
			id_perfil = $2,
			bit_agregar = $3,
			bit_editar = $4,
			bit_consulta = $5,
			bit_eliminar = $6,
			bit_detalle = $7
		WHERE id = $8
	`,
		p.IDModulo,
		p.IDPerfil,
		p.BitAgregar,
		p.BitEditar,
		p.BitConsulta,
		p.BitEliminar,
		p.BitDetalle,
		id,
	)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error actualizando permiso"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Permiso no encontrado"})
		return
	}

	p.ID = id
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) Delete(w http.ResponseWriter, id int64) {
	res, err := h.DB.Exec(`DELETE FROM permisos_perfil WHERE id = $1`, id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "Error eliminando permiso"})
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "Permiso no encontrado"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "Permiso eliminado"})
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