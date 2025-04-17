package config

import (
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/spf13/viper"
)

type Config struct {
	Port              string `mapstructure:"port"`
	JWTSecret         string `mapstructure:"jwt_secret"`
	GoogleClientID    string `mapstructure:"google_client_id"`
	GoogleClientSecret string `mapstructure:"google_client_secret"`
	GoogleRedirectURI string `mapstructure:"google_redirect_uri"`
	GroqAPIKey        string `mapstructure:"groq_api_key"`
	DatabaseURL       string `mapstructure:"database_url"`
}

var (
	cfg  Config
	once sync.Once
)

// Load lee la configuración solo una vez (thread‑safe).
func Load() (*Config, error) {
	var err error
	once.Do(func() {
		err = load()
	})
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

func load() error {
	viper.SetConfigType("yaml")

	// 1) Valores por defecto
	viper.SetDefault("port", "8080")

	// 2) Archivo de configuración
	configPath := os.Getenv("LUKALIBRE_CONFIG")
	if configPath == "" {
		configPath = "config.yaml"
	}
	viper.SetConfigFile(configPath)
	_ = viper.ReadInConfig() // ignora error si el archivo no existe

	// 3) Variables de entorno (prefijo LUKA_)
	viper.SetEnvPrefix("LUKA")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// 4) Unmarshal a la estructura
	if err := viper.Unmarshal(&cfg); err != nil {
		return fmt.Errorf("no se pudo deserializar config: %w", err)
	}
	return nil
}
