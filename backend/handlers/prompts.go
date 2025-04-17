package handlers

import (
	"context"

	"github.com/gofiber/fiber/v2"

	"github.com/raestrada/lukalibre/backend/db"
)

func ListPromptsHandler(c *fiber.Ctx) error {
	list, err := db.ListPrompts(context.Background())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("DB error")
	}
	return c.JSON(list)
}
