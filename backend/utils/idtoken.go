package utils

import (
	"context"

	"google.golang.org/api/idtoken"
)

// ParseIDToken verifica y devuelve las claims del id_token de Google.
func ParseIDToken(idToken string) (map[string]interface{}, error) {
	payload, err := idtoken.Validate(context.Background(), idToken, "")
	if err != nil {
		return nil, err
	}
	return payload.Claims, nil
}
