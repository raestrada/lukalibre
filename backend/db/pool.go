package db

import (
	"context"
	"time"

	"github.com/charmbracelet/log"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/raestrada/lukalibre/backend/config"
)

var Pool *pgxpool.Pool

// Init crea un pool de conexiones y lo deja en el paquete db.
func Init(cfg *config.Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	p, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	// Verificamos con un ping
	if err := p.Ping(ctx); err != nil {
		return err
	}

	Pool = p
	log.Info("PostgreSQL conectado")
	return nil
}
