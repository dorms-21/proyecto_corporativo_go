package routes

import (
	"database/sql"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"

	"proyecto_corporativo_go/internal/config"
)

type GenericModulePageData struct {
	Title       string
	ModuleName  string
	Route       string
	Description string
}

func RegisterWebRoutes(mux *http.ServeMux, database *sql.DB, cfg *config.Config) {
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	})

	mux.HandleFunc("/login", renderPage("login.html"))
	mux.HandleFunc("/dashboard", renderPage("dashboard.html"))

	// Seguridad
	mux.HandleFunc("/seguridad/perfil", renderPage("perfil.html"))
	mux.HandleFunc("/seguridad/perfil/nuevo", renderPage("perfil_nuevo.html"))
	mux.HandleFunc("/seguridad/perfil/editar/", renderPage("perfil_editar.html"))

	mux.HandleFunc("/seguridad/modulo", renderPage("modulo.html"))
	mux.HandleFunc("/seguridad/modulo/nuevo", renderPage("modulo_nuevo.html"))
	mux.HandleFunc("/seguridad/modulo/editar/", renderPage("modulo_editar.html"))

	mux.HandleFunc("/seguridad/usuario", renderPage("usuario.html"))
	mux.HandleFunc("/seguridad/usuario/nuevo", renderPage("usuario_nuevo.html"))
	mux.HandleFunc("/seguridad/usuario/editar/", renderPage("usuario_editar.html"))

	mux.HandleFunc("/seguridad/permisos-perfil", renderPage("permisos_perfil.html"))

	// Principales conocidos
	mux.HandleFunc("/principal1/principal-1-1", renderPage("principal_1_1.html"))
	mux.HandleFunc("/principal1/principal-1-2", renderPage("principal_1_2.html"))
	mux.HandleFunc("/principal2/principal-2-1", renderPage("principal_2_1.html"))
	mux.HandleFunc("/principal2/principal-2-2", renderPage("principal_2_2.html"))

	// Dinámicos
	mux.HandleFunc("/seguridad/", renderGenericModulePage(database))
	mux.HandleFunc("/principal1/", renderGenericModulePage(database))
	mux.HandleFunc("/principal2/", renderGenericModulePage(database))

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

func renderGenericModulePage(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Redirect(w, r, "/404", http.StatusSeeOther)
			return
		}

		path := r.URL.Path

		knownPaths := map[string]bool{
			"/seguridad/perfil":          true,
			"/seguridad/perfil/nuevo":    true,
			"/seguridad/modulo":          true,
			"/seguridad/modulo/nuevo":    true,
			"/seguridad/usuario":         true,
			"/seguridad/usuario/nuevo":   true,
			"/seguridad/permisos-perfil": true,
			"/principal1/principal-1-1":  true,
			"/principal1/principal-1-2":  true,
			"/principal2/principal-2-1":  true,
			"/principal2/principal-2-2":  true,
		}

		if knownPaths[path] || strings.Contains(path, "/editar/") {
			http.Redirect(w, r, "/404", http.StatusSeeOther)
			return
		}

		var moduleName string
		err := database.QueryRow(`
			SELECT str_nombre_modulo
			FROM modulo
			WHERE str_ruta = $1
			LIMIT 1
		`, path).Scan(&moduleName)

		if err != nil {
			http.Redirect(w, r, "/404", http.StatusSeeOther)
			return
		}

		fullPath := filepath.Join("web", "templates", "pages", "generic_module.html")
		tmpl, err := template.ParseFiles(fullPath)
		if err != nil {
			http.Error(w, "error cargando plantilla", http.StatusInternalServerError)
			return
		}

		data := GenericModulePageData{
			Title:       moduleName,
			ModuleName:  moduleName,
			Route:       path,
			Description: "Pantalla generada automáticamente para módulos nuevos.",
		}

		if err := tmpl.Execute(w, data); err != nil {
			http.Error(w, "error renderizando plantilla", http.StatusInternalServerError)
			return
		}
	}
}
