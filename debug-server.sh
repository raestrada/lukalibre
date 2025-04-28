#!/bin/bash
set -e

# Colores para logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Script de Depuración para LukaLibre VM${NC}"
echo -e "${BLUE}===============================================${NC}"

echo -e "${GREEN}Corriendo desde $(pwd)${NC}"

# Cargar variables desde .secrets
if [ -f ".secrets" ]; then
  echo -e "${GREEN}Cargando variables desde .secrets...${NC}"
  source .secrets
  export GCP_PROJECT_ID
  export GCP_REGION
  export CLOUDFLARE_TUNNEL_TOKEN
  export API_DOMAIN
  export GCP_SA_KEY
  export DB_PASSWORD
  export TERRAFORM_TOKEN
  export TUNNEL_ID
  
  echo -e "${GREEN}Variables cargadas correctamente:${NC}"
  echo "TUNNEL_ID: $TUNNEL_ID"
  echo "API_DOMAIN: $API_DOMAIN"
  echo "DB_PASSWORD: ***********" # No mostrar la contraseña real
else
  echo -e "${RED}Archivo .secrets no encontrado${NC}"
  echo "Crea un archivo .secrets con las variables necesarias"
  exit 1
fi

# Funciones de diagnóstico

check_environment() {
  echo -e "${BLUE}Verificando entorno de ejecución...${NC}"
  
  echo "Usuario actual: $(whoami)"
  echo "Directorio actual: $(pwd)"
  echo "Estructura del directorio backend:"
  find ./backend -maxdepth 2 -type d | sort
  
  # Verificar existencia de archivos clave
  echo "Buscando archivos de configuración..."
  if [ -f "./backend/Dockerfile.vm" ]; then
    echo -e "${GREEN}Dockerfile.vm encontrado${NC}"
  else
    echo -e "${YELLOW}Dockerfile.vm no encontrado${NC}"
  fi
  
  if [ -d "./backend/scripts" ]; then
    echo -e "${GREEN}Directorio scripts encontrado${NC}"
    ls -la ./backend/scripts/
  else
    echo -e "${YELLOW}Directorio scripts no encontrado${NC}"
    mkdir -p ./backend/scripts
  fi
}

check_files() {
  echo -e "${BLUE}Verificando archivos necesarios...${NC}"
  
  # Verificar Dockerfile.vm
  if [ -f "./backend/Dockerfile.vm" ]; then
    echo -e "${GREEN}Dockerfile.vm encontrado${NC}"
  else
    echo -e "${RED}Error: Dockerfile.vm no encontrado${NC}"
    echo "Deberías estar ejecutando este script desde la raíz del repositorio clonado"
    exit 1
  fi
  
  # Verificar scripts necesarios
  if [ -f "./backend/scripts/start-services.sh" ]; then
    echo -e "${GREEN}Script start-services.sh encontrado${NC}"
  else
    echo -e "${RED}Error: Script start-services.sh no encontrado${NC}"
    echo "Estructura de directorio incorrecta"
    exit 1
  fi
  
  if [ -f "./backend/scripts/supervisord.conf" ]; then
    echo -e "${GREEN}Archivo supervisord.conf encontrado${NC}"
  else
    echo -e "${RED}Error: Archivo supervisord.conf no encontrado${NC}"
    echo "Estructura de directorio incorrecta"
    exit 1
  fi
  
  # Crear archivo .env con las variables de entorno
  echo -e "${BLUE}Creando archivo .env con las variables correctas...${NC}"
  cat > ./backend/.env << EOF
DB_USER=lukalibre_app
DB_PASSWORD=$DB_PASSWORD
DB_NAME=lukalibre
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://lukalibre_app:$DB_PASSWORD@localhost:5432/lukalibre
CLOUDFLARE_TUNNEL_TOKEN='$CLOUDFLARE_TUNNEL_TOKEN'
TUNNEL_ID=$TUNNEL_ID
API_DOMAIN=$API_DOMAIN
EOF

  echo -e "${GREEN}Archivo .env creado correctamente${NC}"
  echo "Contenido del archivo .env (ocultando contraseñas):"
  grep -v PASSWORD ./backend/.env | grep -v TOKEN
}

check_docker() {
  echo -e "${BLUE}Verificando Docker...${NC}"
  
  # Verificar si Docker está instalado
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker no está instalado. Instalando...${NC}"
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl enable docker
  else
    echo -e "${GREEN}Docker ya está instalado${NC}"
  fi
  
  # Verificar si Docker está ejecutándose
  if systemctl is-active --quiet docker; then
    echo -e "${GREEN}Docker está activo${NC}"
  else
    echo -e "${YELLOW}Docker no está activo. Iniciando...${NC}"
    systemctl start docker
  fi
  
  # Información de Docker
  docker info
  docker ps -a
}

build_and_run_container() {
  echo -e "${BLUE}Construyendo y ejecutando contenedor...${NC}"
  
  # Crear directorio para datos persistentes
  echo "Creando directorio para datos persistentes..."
  sudo mkdir -p /data/postgres
  sudo chmod 777 /data/postgres
  
  # Construir imagen
  echo "Construyendo la imagen Docker..."
  cd ./backend
  docker build -t lukalibre-app:latest -f Dockerfile.vm .
  
  # Detener y eliminar contenedor existente si existe
  docker stop lukalibre-app 2>/dev/null || true
  docker rm lukalibre-app 2>/dev/null || true
  
  # Ejecutar nuevo contenedor
  echo -e "${GREEN}Ejecutando contenedor...${NC}"
  docker run -d --name lukalibre-app \
    -p 8000:8000 -p 5432:5432 \
    -v /data/postgres:/var/lib/postgresql/15/main \
    -e DB_USER=lukalibre_app \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_NAME=lukalibre \
    -e DB_HOST=localhost \
    -e DB_PORT=5432 \
    -e DATABASE_URL="postgresql://lukalibre_app:$DB_PASSWORD@localhost:5432/lukalibre" \
    -e CLOUDFLARE_TUNNEL_TOKEN="$CLOUDFLARE_TUNNEL_TOKEN" \
    -e TUNNEL_ID="$TUNNEL_ID" \
    -e API_DOMAIN="$API_DOMAIN" \
    --restart always \
    lukalibre-app:latest
  
  # Verificar que el contenedor está corriendo
  docker ps
}

check_logs() {
  echo -e "${BLUE}Verificando logs del contenedor...${NC}"
  docker logs lukalibre-app
  
  echo -e "${YELLOW}Para ver logs en tiempo real, ejecuta: docker logs -f lukalibre-app${NC}"
}

# Menú principal
echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Selecciona una opción:${NC}"
echo "1) Ejecutar todo el proceso de depuración"
echo "2) Verificar entorno y configuración"
echo "3) Verificar y crear archivo .env"
echo "4) Verificar Docker"
echo "5) Construir y ejecutar contenedor"
echo "6) Ver logs del contenedor"
echo "7) Ver configuración de Cloudflare Tunnel"
echo "q) Salir"

read -p "Opción: " option

case $option in
  1)
    check_environment
    check_files
    check_docker
    build_and_run_container
    check_logs
    ;;
  2)
    check_environment
    ;;
  3)
    check_files
    ;;
  4)
    check_docker
    ;;
  5)
    build_and_run_container
    ;;
  6)
    check_logs
    ;;
  7)
    echo -e "${BLUE}Configuración del túnel Cloudflare:${NC}"
    echo "TUNNEL_ID: $TUNNEL_ID"
    echo "API_DOMAIN: $API_DOMAIN"
    echo "Token disponible: $([ ! -z "$CLOUDFLARE_TUNNEL_TOKEN" ] && echo 'Sí' || echo 'No')"
    
    # Mostrar la configuración de cloudflared si existe
    if [ -f "/etc/cloudflared/config.yml" ]; then
      echo -e "${GREEN}Archivo de configuración de cloudflared:${NC}"
      cat /etc/cloudflared/config.yml
    else
      echo -e "${YELLOW}No se encontró la configuración de cloudflared en /etc/cloudflared/config.yml${NC}"
    fi
    ;;
  q|Q)
    echo "Saliendo..."
    exit 0
    ;;
  *)
    echo -e "${RED}Opción inválida${NC}"
    ;;
esac

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Proceso de depuración finalizado${NC}"
echo -e "${BLUE}===============================================${NC}"
