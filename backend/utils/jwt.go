package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CreateJWT firma un token propio con sub y email.
func CreateJWT(sub, email, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   sub,
		"email": email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

// VerifyJWT valida y devuelve claims.
func VerifyJWT(token, secret string) (jwt.MapClaims, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return nil, err
	}
	return parsed.Claims.(jwt.MapClaims), nil
}
