package auth

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"
	"github.com/golang-jwt/jwt/v5"
	"proyecto_corporativo_go/internal/config"
)

type Handler struct {
	DB     *sql.DB
	Config *config.Config
}

type LoginRequest struct {
	Usuario  string `json:"usuario"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
}

type User struct {
	ID               int64  `json:"id"`
	StrNombreUsuario string `json:"strNombreUsuario"`
	IDPerfil         int64  `json:"idPerfil"`
	PerfilNombre     string `json:"perfilNombre"`
	IDEstadoUsuario  int    `json:"idEstadoUsuario"`
	EstadoNombre     string `json:"estadoNombre"`
	StrCorreo        string `json:"strCorreo"`
	StrNumeroCelular string `json:"strNumeroCelular"`
	StrImagenUsuario string `json:"strImagenUsuario"`
}

type MenuGroup struct {
	Menu    string       `json:"menu"`
	Modulos []MenuModule `json:"modulos"`
}

type MenuModule struct {
	ID     int64  `json:"id"`
	Nombre string `json:"nombre"`
	Clave  string `json:"clave"`
	Ruta   string `json:"ruta"`
}

func NewHandler(db *sql.DB, cfg *config.Config) *Handler {
	return &Handler{
		DB:     db,
		Config: cfg,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"message": "Método no permitido",
		})
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"message": "JSON inválido",
		})
		return
	}

	req.Usuario = strings.TrimSpace(req.Usuario)
	req.Password = strings.TrimSpace(req.Password)
	req.Captcha = strings.TrimSpace(req.Captcha)

	if req.Usuario == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"message": "Usuario y contraseña son obligatorios",
		})
		return
	}

	log.Println("LOGIN intento:", req.Usuario)

	user, plainPassword, err := h.findUserByUsername(req.Usuario)
	if err != nil {
		log.Println("usuario no encontrado:", req.Usuario)
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"message": "Usuario o contraseña incorrectos",
		})
		return
	}

	log.Println("usuario encontrado:", user.StrNombreUsuario)
	log.Println("estado:", user.EstadoNombre)

if strings.ToUpper(user.EstadoNombre) != "ACTIVO" {
	writeJSON(w, http.StatusUnauthorized, map[string]any{
		"message": "Esta cuenta tiene estado inactivo. Contacte a soporte.",
	})
	return
}

	if plainPassword != req.Password {
		log.Println("password incorrecto")
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"message": "Usuario o contraseña incorrectos",
		})
		return
	}

	token, err := h.generateJWT(user)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"message": "No se pudo generar el token",
		})
		return
	}

	menus, _ := h.getMenusForUser(user.IDPerfil)
	permissions, _ := h.getPermissionsForProfile(user.IDPerfil)

	writeJSON(w, http.StatusOK, map[string]any{
		"message":     "Login correcto",
		"token":       token,
		"user":        user,
		"menus":       menus,
		"permissions": permissions,
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
			"message": "Método no permitido",
		})
		return
	}

	tokenString, err := getBearerToken(r)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"message": "Token requerido",
		})
		return
	}

	claims, err := h.parseJWT(tokenString)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"message": "Token inválido",
		})
		return
	}

	user, _, err := h.findUserByUsername(claims.Username)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]any{
			"message": "Usuario no encontrado",
		})
		return
	}

	menus, _ := h.getMenusForUser(user.IDPerfil)
	permissions, _ := h.getPermissionsForProfile(user.IDPerfil)

	writeJSON(w, http.StatusOK, map[string]any{
		"user":        user,
		"menus":       menus,
		"permissions": permissions,
	})
}

func (h *Handler) findUserByUsername(username string) (User, string, error) {
	const query = `
		SELECT
			u.id,
			u.str_nombre_usuario,
			u.id_perfil,
			p.str_nombre_perfil,
			u.id_estado_usuario,
			eu.str_nombre,
			u.str_correo,
			COALESCE(u.str_numero_celular, ''),
			COALESCE(u.str_imagen_usuario, ''),
			u.str_pwd
		FROM usuario u
		INNER JOIN perfil p ON p.id = u.id_perfil
		INNER JOIN estado_usuario eu ON eu.id = u.id_estado_usuario
		WHERE LOWER(u.str_nombre_usuario) = LOWER($1)
		LIMIT 1
	`

	var user User
	var plainPassword string

	err := h.DB.QueryRow(query, username).Scan(
		&user.ID,
		&user.StrNombreUsuario,
		&user.IDPerfil,
		&user.PerfilNombre,
		&user.IDEstadoUsuario,
		&user.EstadoNombre,
		&user.StrCorreo,
		&user.StrNumeroCelular,
		&user.StrImagenUsuario,
		&plainPassword,
	)

	return user, plainPassword, err
}

type CustomClaims struct {
	UserID   int64  `json:"userId"`
	Username string `json:"username"`
	IDPerfil int64  `json:"idPerfil"`
	jwt.RegisteredClaims
}

func (h *Handler) generateJWT(user User) (string, error) {
	claims := CustomClaims{
		UserID:   user.ID,
		Username: user.StrNombreUsuario,
		IDPerfil: user.IDPerfil,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "proyecto_corporativo_go",
			Subject:   user.StrNombreUsuario,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.Config.JWTSecret))
}

func (h *Handler) parseJWT(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (any, error) {
		return []byte(h.Config.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}

func getBearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", http.ErrNoCookie
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", http.ErrNoCookie
	}

	return parts[1], nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *Handler) getMenusForUser(idPerfil int64) ([]MenuGroup, error) {
	const query = `
		SELECT
			me.id,
			me.str_nombre_menu,
			mo.id,
			mo.str_nombre_modulo,
			mo.str_clave_modulo,
			mo.str_ruta
		FROM permisos_perfil pp
		INNER JOIN modulo mo ON mo.id = pp.id_modulo
		INNER JOIN menu_modulo mm ON mm.id_modulo = mo.id
		INNER JOIN menu me ON me.id = mm.id_menu
		WHERE pp.id_perfil = $1
		  AND (
			pp.bit_agregar = TRUE OR
			pp.bit_editar = TRUE OR
			pp.bit_consulta = TRUE OR
			pp.bit_eliminar = TRUE OR
			pp.bit_detalle = TRUE
		  )
		ORDER BY me.int_orden, mm.int_orden, mo.str_nombre_modulo
	`

	rows, err := h.DB.Query(query, idPerfil)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type tempRow struct {
		MenuID       int64
		MenuNombre   string
		ModuloID     int64
		ModuloNombre string
		ModuloClave  string
		ModuloRuta   string
	}

	var temp []tempRow
	for rows.Next() {
		var row tempRow
		if err := rows.Scan(
			&row.MenuID,
			&row.MenuNombre,
			&row.ModuloID,
			&row.ModuloNombre,
			&row.ModuloClave,
			&row.ModuloRuta,
		); err != nil {
			return nil, err
		}
		temp = append(temp, row)
	}

	menuMap := make(map[int64]*MenuGroup)
	order := make([]int64, 0)

	for _, row := range temp {
		if _, exists := menuMap[row.MenuID]; !exists {
			menuMap[row.MenuID] = &MenuGroup{
				Menu:    row.MenuNombre,
				Modulos: []MenuModule{},
			}
			order = append(order, row.MenuID)
		}

		menuMap[row.MenuID].Modulos = append(menuMap[row.MenuID].Modulos, MenuModule{
			ID:     row.ModuloID,
			Nombre: row.ModuloNombre,
			Clave:  row.ModuloClave,
			Ruta:   row.ModuloRuta,
		})
	}

	result := make([]MenuGroup, 0, len(order))
	for _, id := range order {
		result = append(result, *menuMap[id])
	}

	return result, nil
}

func (h *Handler) getPermissionsForProfile(idPerfil int64) (map[string]any, error) {
	const query = `
		SELECT
			mo.str_clave_modulo,
			pp.bit_agregar,
			pp.bit_editar,
			pp.bit_consulta,
			pp.bit_eliminar,
			pp.bit_detalle
		FROM permisos_perfil pp
		INNER JOIN modulo mo ON mo.id = pp.id_modulo
		WHERE pp.id_perfil = $1
	`

	rows, err := h.DB.Query(query, idPerfil)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	permissions := make(map[string]any)

	for rows.Next() {
		var clave string
		var agregar, editar, consulta, eliminar, detalle bool

		if err := rows.Scan(&clave, &agregar, &editar, &consulta, &eliminar, &detalle); err != nil {
			return nil, err
		}

		permissions[clave] = map[string]bool{
			"agregar":  agregar,
			"editar":   editar,
			"consulta": consulta,
			"eliminar": eliminar,
			"detalle":  detalle,
		}
	}

	return permissions, nil
}
