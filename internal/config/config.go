package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort     string
	AppEnv      string
	BaseURL     string
	DatabaseURL string
	JWTSecret   string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		AppPort:     getEnv("APP_PORT", getEnv("PORT", "8080")),
		AppEnv:      getEnv("APP_ENV", "development"),
		BaseURL:     getEnv("BASE_URL", "http://localhost:8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", "cambia_esta_clave_super_secreta"),
	}

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL no está definida en el entorno o en .env")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}