package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"proyecto_corporativo_go/internal/config"
	"proyecto_corporativo_go/internal/db"
	"proyecto_corporativo_go/internal/routes"
)

func main() {
	cfg := config.Load()

	database, err := db.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("error conectando a la base de datos: %v", err)
	}
	defer database.Close()

	mux := http.NewServeMux()

	staticFS := http.FileServer(http.Dir("web/static"))
	mux.Handle("/static/", http.StripPrefix("/static/", staticFS))

	uploadsFS := http.FileServer(http.Dir("uploads"))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", uploadsFS))

	routes.RegisterWebRoutes(mux, database, cfg)
	routes.RegisterAPIRoutes(mux, database, cfg)

	handler := loggingMiddleware(recoveryMiddleware(mux))

	server := &http.Server{
		Addr:         ":" + cfg.AppPort,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("servidor iniciado en puerto %s", cfg.AppPort)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("error iniciando servidor: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recuperado: %v", rec)
				http.Redirect(w, r, "/500", http.StatusSeeOther)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func init() {
	_ = os.Setenv("TZ", "America/Mexico_City")
}