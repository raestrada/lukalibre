package handlers

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"github.com/charmbracelet/log"
	"github.com/gofiber/fiber/v2"

	"github.com/raestrada/lukalibre/backend/config"
)

// MaxPayload = 128 KB para evitar abusos y proteger memoria.
const MaxPayload = 128 << 10 // 131 072 bytes

// LLMProxy recibe el JSON generado por el navegador y lo reenvía a Groq.
// 1. No guarda nada en disco. 2. No logea el contenido del prompt.
func LLMProxy(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Limitar tamaño
		if len(c.Body()) > MaxPayload {
			return c.Status(fiber.StatusRequestEntityTooLarge).SendString("Payload demasiado grande")
		}

		// Crear request a Groq (modo chat completions)
		req, err := http.NewRequest("POST", "https://api.groq.com/v1/chat/completions", bytes.NewReader(c.Body()))
		if err != nil {
			log.Error("crear req", "err", err)
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+cfg.GroqAPIKey)

		// Timeout pequeño para no colgar al cliente
		client := &http.Client{Timeout: 40 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Error("Groq proxy", "err", err)
			return c.Status(fiber.StatusBadGateway).SendString("LLM no disponible")
		}
		defer resp.Body.Close()

		// Propagar código y encabezados relevantes
		c.Status(resp.StatusCode)
		c.Set("Content-Type", resp.Header.Get("Content-Type"))

		// Stream (o copiar) respuesta sin almacenarla
		if _, err := io.Copy(c, resp.Body); err != nil {
			log.Warn("copiar respuesta LLM", "err", err)
		}
		return nil
	}
}
