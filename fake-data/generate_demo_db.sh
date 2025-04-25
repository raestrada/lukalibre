#!/bin/bash

# Script para generar la base de datos SQLite de demostración para LukaLibre
# Este script crea un archivo SQLite con datos de prueba para desarrollo

# Definir variables
DB_FILE="lukalibre_demo.db"
TABLES_SQL="create_tables.sql"
DATA_SQL="create_demo_data.sql"
SCRIPT_DIR=$(dirname "$0")

echo "Generando base de datos de demostración para LukaLibre..."
echo "Directorio de trabajo: $SCRIPT_DIR"

# Eliminar la base de datos si ya existe
if [ -f "$SCRIPT_DIR/$DB_FILE" ]; then
  echo "Eliminando base de datos existente..."
  rm "$SCRIPT_DIR/$DB_FILE"
fi

# Crear el esquema de la base de datos
echo "Creando tablas..."
sqlite3 "$SCRIPT_DIR/$DB_FILE" < "$SCRIPT_DIR/$TABLES_SQL"

# Insertar datos de demostración
echo "Insertando datos de prueba..."
sqlite3 "$SCRIPT_DIR/$DB_FILE" < "$SCRIPT_DIR/$DATA_SQL"

# Verificar que la base de datos se haya creado correctamente
if [ -f "$SCRIPT_DIR/$DB_FILE" ]; then
  echo "Base de datos creada exitosamente en: $SCRIPT_DIR/$DB_FILE"
  echo "Estadísticas de la base de datos:"
  
  # Mostrar el conteo de registros en cada tabla
  for TABLE in categorias gastos ingresos metas movimientos_ahorro recomendaciones resumen_mensual metadata; do
    COUNT=$(sqlite3 "$SCRIPT_DIR/$DB_FILE" "SELECT COUNT(*) FROM $TABLE;")
    echo "- Tabla $TABLE: $COUNT registros"
  done
else
  echo "Error: No se pudo crear la base de datos."
  exit 1
fi

echo "¡Listo! La base de datos de demostración está disponible para desarrollo."
