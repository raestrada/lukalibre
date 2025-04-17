package db

import (
	"embed"
	"fmt"

	"github.com/charmbracelet/log"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/pgx"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations aplica todas las migraciones pendientes al arranque.
func RunMigrations(databaseURL string) error {
	src, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("source: %w", err)
	}

	db, err := Pool.Acquire(context.Background())
	if err != nil {
		return err
	}
	defer db.Release()

	driver, err := pgx.WithInstance(db.Conn(), &pgx.Config{})
	if err != nil {
		return err
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	log.Info("Migraciones aplicadas correctamente")
	return nil
}
