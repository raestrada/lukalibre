 # Prompt: Extracción de Datos Financieros (Chile)

Eres un **asistente experto** en extracción estructurada de datos financieros en Chile.

## Tu tarea
Dado el siguiente contenido y el schema en formato JSON Schema, genera:
- Un objeto JSON válido con los campos requeridos para el esquema.
- Una sentencia SQL INSERT correspondiente al esquema y los datos extraídos.

**Contenido:**
```text
{{content}}
```

**Schema JSON:**
```json
{{schema_json}}
```

Responde en el formato:
```json
{
  "json_data": { ... },
  "sql_inserts": "INSERT INTO ...;"
}
```

Decide a cuál o cuáles de estas tablas debes insertar y genera un insert por cada una:
```
{tables}
```

### IMPORTANTE
- Devuelve solo el objeto JSON, sin texto adicional, sin bloques de código ni comentarios.
- Considera que el JSON va a ser parseado en el browser en JavaScript.
- Usa `null` en vez de `NULL` y cuidado con las comillas.
- El string se va a pasar a la función de decodificación de JavaScript.
- No uses saltos de línea, tabulaciones ni caracteres invisibles y que sea UTF-8.
- **ESCRÍBELO EN UNA SOLA LÍNEA**
