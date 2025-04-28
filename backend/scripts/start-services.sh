#!/bin/bash
set -e

# Función para iniciar PostgreSQL
start_postgres() {
  echo "Iniciando PostgreSQL..."

  # Configurar variables de entorno para PostgreSQL si se proporcionan
  if [ ! -z "$DB_PASSWORD" ]; then
    echo "Actualizando contraseña de PostgreSQL..."
    /etc/init.d/postgresql start
    su postgres -c "psql -c \"ALTER USER lukalibre_app WITH PASSWORD '$DB_PASSWORD';\"" 
    /etc/init.d/postgresql stop
  fi
  
  # Iniciar PostgreSQL como usuario postgres
  mkdir -p /var/run/postgresql/15-main.pg_stat_tmp
  chown -R postgres:postgres /var/run/postgresql/
  echo "exec su postgres -c \"/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/15/main -c config_file=/etc/postgresql/15/main/postgresql.conf\""
  exec su postgres -c "/usr/lib/postgresql/15/bin/postgres -D /var/lib/postgresql/15/main -c config_file=/etc/postgresql/15/main/postgresql.conf"
}

# Función para iniciar la API
start_api() {
  echo "Esperando que PostgreSQL esté listo..."
  while ! pg_isready -h localhost -U lukalibre_app -d lukalibre; do
    echo "PostgreSQL no está listo... esperando"
    sleep 1
  done
  
  echo "Ejecutando migraciones de Alembic..."
  alembic upgrade head
  
  echo "Iniciando API..."
  exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
}

# Función para iniciar Cloudflare Tunnel
start_cloudflared() {
  echo "Iniciando Cloudflare Tunnel..."
  
  # Verificar que existan las variables de entorno necesarias
  if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo "Error: No se ha definido CLOUDFLARE_TUNNEL_TOKEN"
    echo "Esperando 30 segundos y reintentando..."
    sleep 30
    if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
      echo "Error fatal: No se puede iniciar el túnel sin un token"
      exit 1
    fi
  fi
  
  # Crear directorio para configuración
  mkdir -p /etc/cloudflared
  
  # Verificar si el token es un JSON completo o solo un token
  if [[ "$CLOUDFLARE_TUNNEL_TOKEN" == {* ]]; then
    # Es un JSON completo
    echo "$CLOUDFLARE_TUNNEL_TOKEN" > /etc/cloudflared/cert.json
  else
    # Es solo un token, hay que configurar el archivo de configuración
    echo "tunnel: $TUNNEL_ID" > /etc/cloudflared/config.yml
    echo "credentials-file: /etc/cloudflared/cert.json" >> /etc/cloudflared/config.yml
    echo "ingress:" >> /etc/cloudflared/config.yml
    echo "  - hostname: $API_DOMAIN" >> /etc/cloudflared/config.yml
    echo "    service: http://localhost:8000" >> /etc/cloudflared/config.yml
    echo "  - service: http_status:404" >> /etc/cloudflared/config.yml
    
    echo "$CLOUDFLARE_TUNNEL_TOKEN" > /etc/cloudflared/cert.json
  fi
  
  echo "Ejecutando Cloudflare Tunnel..."
  exec cloudflared tunnel run
}

# Definir qué servicio iniciar basado en el primer argumento
case "$1" in
  postgres)
    start_postgres
    ;;
  api)
    start_api
    ;;
  cloudflared)
    start_cloudflared
    ;;
  *)
    echo "Uso: $0 {postgres|api|cloudflared}"
    exit 1
    ;;
esac
