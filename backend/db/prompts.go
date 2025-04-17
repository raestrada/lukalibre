package db

import "context"

type Prompt struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

// ListPrompts devuelve todos los templates activos.
func ListPrompts(ctx context.Context) ([]Prompt, error) {
	rows, err := Pool.Query(ctx, `SELECT id, name, content FROM prompts ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Prompt
	for rows.Next() {
		var p Prompt
		if err := rows.Scan(&p.ID, &p.Name, &p.Content); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}
