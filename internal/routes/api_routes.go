package routes

import (
	"database/sql"
	"net/http"

	"proyecto_corporativo_go/internal/api/auth"
	"proyecto_corporativo_go/internal/api/modulo"
	"proyecto_corporativo_go/internal/api/perfil"
	permisosperfil "proyecto_corporativo_go/internal/api/permisos_perfil"
	"proyecto_corporativo_go/internal/api/usuario"
	"proyecto_corporativo_go/internal/config"
)

func RegisterAPIRoutes(mux *http.ServeMux, database *sql.DB, cfg *config.Config) {
	authHandler := auth.NewHandler(database, cfg)
	perfilHandler := perfil.NewHandler(database)
	moduloHandler := modulo.NewHandler(database)
	usuarioHandler := usuario.NewHandler(database)
	permisosHandler := permisosperfil.NewHandler(database)

	mux.HandleFunc("/api/auth/login", authHandler.Login)
	mux.HandleFunc("/api/auth/me", authHandler.Me)

	mux.HandleFunc("/api/perfiles", perfilHandler.Handle)
	mux.HandleFunc("/api/perfiles/", perfilHandler.HandleByID)

	mux.HandleFunc("/api/modulos", moduloHandler.Handle)
	mux.HandleFunc("/api/modulos/", moduloHandler.HandleByID)

	mux.HandleFunc("/api/usuarios", usuarioHandler.Handle)
	mux.HandleFunc("/api/usuarios/", usuarioHandler.HandleByID)

	mux.HandleFunc("/api/permisos-perfil", permisosHandler.Handle)
	mux.HandleFunc("/api/permisos-perfil/", permisosHandler.HandleByID)
}