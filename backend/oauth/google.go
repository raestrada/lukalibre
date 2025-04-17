package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/charmbracelet/log"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/raestrada/lukalibre/backend/config"
	"github.com/raestrada/lukalibre/backend/utils"
)

var (
	oauthCfg  *oauth2.Config
	jwtSecret string
)

// InitGoogleOAuth configura los valores de OAuth2 usando la info del config.
func InitGoogleOAuth(cfg *config.Config) error {
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" || cfg.GoogleRedirectURI == "" {
		return fmt.Errorf("faltan variables de OAuth de Google")
	}

	oauthCfg = &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURI,
		Scopes: []string{
			"openid",
			"email",
			"profile",
		},
		Endpoint: google.Endpoint,
	}
	jwtSecret = cfg.JWTSecret
	log.Info("Google OAuth inicializado",
		"redirect", cfg.GoogleRedirectURI,
	)
	return nil
}

// LoginHandler genera el state, lo guarda en cookie y redirige a Google.
func LoginHandler(c *fiber.Ctx) error {
	state := utils.RandomString(32)
	c.Cookie(&fiber.Cookie{
		Name:     "oauthstate",
		Value:    state,
		Expires:  time.Now().Add(5 * time.Minute),
		Secure:   true,
		HTTPOnly: true,
		SameSite: "Lax",
	})
	url := oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline)
	return c.Redirect(url, fiber.StatusTemporaryRedirect)
}

// CallbackHandler valida el state, intercambia code y emite JWT.
func CallbackHandler(c *fiber.Ctx) error {
	stateCookie := c.Cookies("oauthstate")
	if stateCookie == "" || stateCookie != c.Query("state") {
		log.Warn("state inválido en callback", "state", c.Query("state"))
		return c.Status(fiber.StatusBadRequest).SendString("Estado inválido")
	}

	code := c.Query("code")
	tok, err := oauthCfg.Exchange(context.Background(), code)
	if err != nil {
		log.Error("error al intercambiar code", "err", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Error de intercambio de código")
	}

	// Extraer información del id_token
	rawIDToken, ok := tok.Extra("id_token").(string)
	if !ok {
		log.Error("id_token no presente")
		return c.Status(fiber.StatusInternalServerError).SendString("Token inválido")
	}

	claims, err := utils.ParseIDToken(rawIDToken)
	if err != nil {
		log.Error("id_token inválido", "err", err)
		return c.Status(fiber.StatusUnauthorized).SendString("Token inválido")
	}

	sub := claims["sub"].(string)
	email := claims["email"].(string)

	// Firmar JWT propio
	jwtStr, err := utils.CreateJWT(sub, email, jwtSecret)
	if err != nil {
		log.Error("error creando JWT", "err", err)
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	// Set cookie
	c.Cookie(&fiber.Cookie{
		Name:     "lukalibre_token",
		Value:    jwtStr,
		Expires:  time.Now().Add(24 * time.Hour),
		Secure:   true,
		HTTPOnly: true,
		SameSite: "Lax",
	})
	log.Info("Login exitoso", "user", sub, "email", email)
	return c.Redirect("/", fiber.StatusTemporaryRedirect)
}

// JWTMiddleware protege rutas privadas verificando el token.
func JWTMiddleware(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Cookies("lukalibre_token")
		if token == "" {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		claims, err := utils.VerifyJWT(token, secret)
		if err != nil {
			log.Warn("JWT inválido", "err", err)
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Guardar claims en contexto
		claimsJSON, _ := json.Marshal(claims)
		c.Locals("userClaims", claimsJSON)
		return c.Next()
	}
}
