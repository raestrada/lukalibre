package main

import (
	"time"

	"github.com/charmbracelet/log"
	"github.com/gofiber/fiber/v2"
	fiberlog "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"github.com/raestrada/lukalibre/backend/config"
	"github.com/raestrada/lukalibre/backend/handlers"
	"github.com/raestrada/lukalibre/backend/oauth"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	log.SetTimeFormat("15:04:05")
	if !log.IsTTY() {
		log.SetFormatter(log.JSONFormatter)
	}

	if err := oauth.InitGoogleOAuth(cfg); err != nil {
		log.Fatalf("oauth init: %v", err)
	}

	app := fiber.New()
	app.Use(fiberlog.New(fiberlog.Config{
		Format:     "[${time}] ${status} - ${latency} ${method} ${path}\n",
		TimeFormat: "15:04:05",
	}))

	// ─── CORS ────────────────────────────────────────────────────────────────
	app.Use(cors.New(cors.Config{
		AllowCredentials: true,
		AllowHeaders:     "Content-Type,Authorization",
		AllowOrigins:     "http://localhost:3000,https://lukalibre.org",
		// si prefieres algo dinámico, usa cfg.FrontendOrigin
	}))

	// ─── Endpoints públicos ─────────────────────────────────────────────────
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	auth := app.Group("/auth")
	auth.Get("/google/login", oauth.LoginHandler)
	auth.Get("/google/callback", oauth.CallbackHandler)

	// ─── Rutas protegidas ───────────────────────────────────────────────────
	protected := app.Group("/api", oauth.JWTMiddleware(cfg.JWTSecret))

	// Prompts (sin límite estricto)
	protected.Get("/config/prompts", handlers.ListPromptsHandler)

	// LLM‑proxy con rate‑limit (20 req/min por usuario)
	protected.Post("/llm-proxy",
		limiter.New(limiter.Config{
			Max:        20,
			Expiration: 1 * time.Minute,
			KeyGenerator: func(c *fiber.Ctx) string {
				return string(c.Cookies("lukalibre_token"))
			},
			LimitReached: func(c *fiber.Ctx) error {
				return c.Status(fiber.StatusTooManyRequests).
					SendString("Demasiadas solicitudes, intenta de nuevo en un minuto")
			},
		}),
		handlers.LLMProxy(cfg),
	)

	log.Infof("🚀 LukaLibre backend escuchando en :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
