package routes

import (
	"database/sql"
	"html/template"
	"net/http"
	"path/filepath"

	"proyecto_corporativo_go/internal/config"
)

func RegisterWebRoutes(mux *http.ServeMux, database *sql.DB, cfg *config.Config) {
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	})

	mux.HandleFunc("/login", renderPage("login.html"))
	mux.HandleFunc("/dashboard", renderPage("dashboard.html"))

	// Seguridad
	mux.HandleFunc("/seguridad/perfil", renderPage("perfil.html"))
	mux.HandleFunc("/seguridad/modulo", renderPage("modulo.html"))
	mux.HandleFunc("/seguridad/usuario", renderPage("usuario.html"))
	mux.HandleFunc("/seguridad/permisos-perfil", renderPage("permisos_perfil.html"))

	// Principal 1
	mux.HandleFunc("/principal1/principal-1-1", renderPage("principal_1_1.html"))
	mux.HandleFunc("/principal1/principal-1-2", renderPage("principal_1_2.html"))

	// Principal 2
	mux.HandleFunc("/principal2/principal-2-1", renderPage("principal_2_1.html"))
	mux.HandleFunc("/principal2/principal-2-2", renderPage("principal_2_2.html"))

	mux.HandleFunc("/seguridad/perfil/editar/", renderPage("perfil_editar.html"))
	mux.HandleFunc("/seguridad/modulo/editar/", renderPage("modulo_editar.html"))
	mux.HandleFunc("/seguridad/usuario/editar/", renderPage("usuario_editar.html"))
	mux.HandleFunc("/seguridad/permisos-perfil/editar/", renderPage("permisos_perfil_editar.html"))

	// Errores
	mux.HandleFunc("/403", renderPage("403.html"))
	mux.HandleFunc("/404", renderPage("404.html"))
	mux.HandleFunc("/500", renderPage("500.html"))
	mux.HandleFunc("/error", renderPage("error.html"))
}

func renderPage(fileName string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Redirect(w, r, "/404", http.StatusSeeOther)
			return
		}

		fullPath := filepath.Join("web", "templates", "pages", fileName)

		tmpl, err := template.ParseFiles(fullPath)
		if err != nil {
			http.Error(w, "error cargando plantilla", http.StatusInternalServerError)
			return
		}

		if err := tmpl.Execute(w, nil); err != nil {
			http.Error(w, "error renderizando plantilla", http.StatusInternalServerError)
			return
		}
	}
}
