#!/bin/bash
set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Banner
echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN} LukaLibre Backend Deployment Pipeline ${NC}"
echo -e "${GREEN} Ejecución local de steps del GitHub Actions ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Verifica si el archivo .secrets existe
if [ ! -f .secrets ]; then
  echo -e "${RED}Error: Archivo .secrets no encontrado${NC}"
  echo -e "Crea un archivo .secrets con el siguiente formato:"
  echo -e "GCP_PROJECT_ID=tu-proyecto-id"
  echo -e "GCP_REGION=us-central1"
  echo -e "CLOUDFLARE_TUNNEL_TOKEN=tu-token-de-cloudflare"
  echo -e "API_DOMAIN=api.lukalibre.org"
  echo -e "GCP_SA_KEY=<base64-encoded-service-account-key>"
  echo -e "DB_PASSWORD=tu-contraseña-db"
  exit 1
fi

# Carga el archivo .secrets como variables de entorno
echo -e "${YELLOW}Cargando variables de entorno desde .secrets...${NC}"
export $(grep -v '^#' .secrets | xargs)

# Verificaciones básicas de herramientas
echo -e "${YELLOW}Verificando herramientas instaladas...${NC}"
TOOLS=("docker" "terraform" "gcloud")
MISSING_TOOLS=()

for tool in "${TOOLS[@]}"; do
  if ! command -v $tool &> /dev/null; then
    MISSING_TOOLS+=($tool)
  fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
  echo -e "${RED}Error: Las siguientes herramientas necesarias no están instaladas:${NC}"
  for tool in "${MISSING_TOOLS[@]}"; do
    echo "  - $tool"
  done
  exit 1
fi

# Menú para seleccionar acción
echo -e "${YELLOW}Selecciona qué parte del pipeline quieres ejecutar:${NC}"
echo -e "1) Ejecutar todo el pipeline"
echo -e "2) Solo Terraform (infraestructura)"
echo -e "3) Solo Docker Build (backend)"
echo -e "4) Solo Deployment (Cloud Run)"
echo -e "5) Crear/configurar Cloudflare Tunnel"
echo -e "q) Salir"

read -p "Opción: " option

# Exporta la versión del tag actual o usa un default
if [ -z "$VERSION" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [[ $CURRENT_BRANCH == "main" || $CURRENT_BRANCH == "master" ]]; then
    VERSION="local-$(date +%Y%m%d-%H%M%S)"
  else
    VERSION="local-$CURRENT_BRANCH-$(date +%Y%m%d-%H%M%S)"
  fi
  export VERSION
fi

# Función para decodificar y guardar el SA key
setup_gcp_auth() {
  echo -e "${YELLOW}Configurando autenticación de GCP...${NC}"
  
  # Decodifica la key y la guarda temporalmente
  if [ ! -z "$GCP_SA_KEY" ]; then
    echo "$GCP_SA_KEY" | base64 -d > /tmp/gcp-key.json
    gcloud auth activate-service-account --key-file=/tmp/gcp-key.json
    gcloud config set project $GCP_PROJECT_ID
    export GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-key.json
    echo -e "${GREEN}Autenticación GCP configurada correctamente${NC}"
  else
    echo -e "${YELLOW}Variable GCP_SA_KEY no encontrada, usando credenciales por defecto...${NC}"
    # Si no hay key, asumimos que gcloud ya está configurado
  fi
}

# Función para ejecutar terraform
run_terraform() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Ejecutando Terraform para infraestructura...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  # Crear bucket de estado si no existe
  BUCKET_NAME="${GCP_PROJECT_ID}-terraform-state"
  if gcloud storage buckets describe gs://$BUCKET_NAME &>/dev/null; then
    echo "El bucket de estado Terraform ya existe: $BUCKET_NAME"
  else
    echo "Creando bucket para estado de Terraform: $BUCKET_NAME"
    gcloud storage buckets create gs://$BUCKET_NAME --location=$GCP_REGION
    gsutil versioning set on gs://$BUCKET_NAME
  fi
  
  # Configura el backend
  cat > terraform/backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "${GCP_PROJECT_ID}-terraform-state"
    prefix = "terraform/state"
  }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}
EOF

  cd terraform
  echo "Inicializando Terraform..."
  terraform init
  
  echo "Ejecutando Terraform plan..."
  terraform plan -var="project_id=$GCP_PROJECT_ID" \
                -var="region=$GCP_REGION" \
                -var="environment=$VERSION" \
                -var="db_password=$DB_PASSWORD" \
                -out=tfplan
  
  read -p "¿Quieres aplicar estos cambios? (s/n): " confirm
  if [[ $confirm == "s" || $confirm == "S" ]]; then
    echo "Aplicando cambios de Terraform..."
    terraform apply -auto-approve tfplan
    
    # Guarda las variables de salida
    export DB_CONNECTION_STRING=$(terraform output -raw db_connection_string)
    export DB_HOST=$(terraform output -raw db_host)
    export DB_NAME=$(terraform output -raw db_name)
    export DB_USERNAME=$(terraform output -raw db_username)
    export DB_PASSWORD=$(terraform output -raw db_password)
    echo -e "${GREEN}Terraform aplicado correctamente. Variables de base de datos configuradas.${NC}"
  else
    echo "Omitiendo aplicación de Terraform"
  fi
  
  cd ..
}

# Función para construir imagen Docker
build_docker() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Construyendo imagen Docker del backend...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  echo "Configurando Docker para GCR..."
  gcloud auth configure-docker gcr.io --quiet
  
  echo "Construyendo imagen Docker..."
  docker build -t gcr.io/$GCP_PROJECT_ID/lukalibre-backend:$VERSION ./backend
  
  read -p "¿Quieres subir la imagen a Container Registry? (s/n): " confirm
  if [[ $confirm == "s" || $confirm == "S" ]]; then
    echo "Subiendo imagen a GCR..."
    docker push gcr.io/$GCP_PROJECT_ID/lukalibre-backend:$VERSION
    echo -e "${GREEN}Imagen subida correctamente: gcr.io/$GCP_PROJECT_ID/lukalibre-backend:$VERSION${NC}"
  else
    echo "Omitiendo push de la imagen"
  fi
}

# Función para desplegar en Cloud Run
deploy_cloud_run() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Desplegando en Cloud Run...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  # Verifica que tengamos todas las variables necesarias
  if [ -z "$DB_CONNECTION_STRING" ] || [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Advertencia: No se encontraron variables de base de datos.${NC}"
    echo -e "${YELLOW}Si ejecutaste Terraform primero, esto no debería ocurrir.${NC}"
    
    # Si no tenemos las variables, preguntamos si quiere continuar
    read -p "¿Quieres continuar de todas formas? (s/n): " confirm
    if [[ $confirm != "s" && $confirm != "S" ]]; then
      echo "Omitiendo despliegue en Cloud Run"
      return
    fi
  fi
  
  echo "Desplegando en Cloud Run..."
  gcloud run deploy lukalibre-backend \
    --image gcr.io/$GCP_PROJECT_ID/lukalibre-backend:$VERSION \
    --platform managed \
    --region $GCP_REGION \
    --no-allow-unauthenticated \
    --set-env-vars="DATABASE_URL=$DB_CONNECTION_STRING,\
                  DB_HOST=$DB_HOST,\
                  DB_NAME=$DB_NAME,\
                  DB_USER=$DB_USERNAME,\
                  DB_PASS=$DB_PASSWORD,\
                  CLOUDFLARE_TUNNEL_TOKEN=$CLOUDFLARE_TUNNEL_TOKEN,\
                  API_DOMAIN=$API_DOMAIN"
  
  echo -e "${GREEN}Servicio desplegado en Cloud Run${NC}"
  SERVICE_URL=$(gcloud run services describe lukalibre-backend --region $GCP_REGION --format="value(status.url)")
  echo -e "${GREEN}URL del servicio: $SERVICE_URL${NC}"
}

# Función para configurar Cloudflare Tunnel
setup_cloudflare_tunnel() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Configurando Cloudflare Tunnel...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  # Verifica si cloudflared está instalado
  if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: cloudflared no está instalado${NC}"
    echo "Instala cloudflared primero: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    return
  fi
  
  # Pregunta por el nombre del túnel
  read -p "Nombre del túnel (default: lukalibre-api): " TUNNEL_NAME
  TUNNEL_NAME=${TUNNEL_NAME:-lukalibre-api}
  
  # Pregunta por el dominio
  read -p "Dominio a conectar (default: api.lukalibre.org): " DOMAIN
  DOMAIN=${DOMAIN:-api.lukalibre.org}
  
  # Pregunta por el archivo de certificado
  read -p "Ruta al archivo de certificado Cloudflare (default: ./cert.pem): " CERT_FILE
  CERT_FILE=${CERT_FILE:-./cert.pem}
  
  if [ ! -f "$CERT_FILE" ]; then
    echo -e "${YELLOW}No se encontró el archivo de certificado. Ejecutando login...${NC}"
    cloudflared tunnel login
    CERT_FILE=~/.cloudflared/cert.pem
  fi
  
  # Crea el túnel
  echo "Creando túnel $TUNNEL_NAME..."
  TUNNEL_ID=$(cloudflared tunnel create $TUNNEL_NAME --credentials-file $CERT_FILE)
  TUNNEL_ID=$(echo $TUNNEL_ID | grep -oP 'Created tunnel \K[a-z0-9-]+')
  
  if [ -z "$TUNNEL_ID" ]; then
    echo -e "${RED}Error: No se pudo crear el túnel.${NC}"
    return
  fi
  
  echo "ID del túnel: $TUNNEL_ID"
  
  # Obtén el token del túnel
  TUNNEL_TOKEN=$(cloudflared tunnel token $TUNNEL_ID --credentials-file $CERT_FILE)
  
  # Configura el DNS
  echo "Configurando DNS para $DOMAIN..."
  cloudflared tunnel route dns $TUNNEL_ID $DOMAIN
  
  # Crea archivo de configuración
  cat > config.yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CERT_FILE

ingress:
  - hostname: $DOMAIN
    service: https://lukalibre-backend-URL.a.run.app
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF
  
  echo -e "${GREEN}Túnel creado correctamente${NC}"
  echo -e "${YELLOW}IMPORTANTE: Guarda este token como secreto CLOUDFLARE_TUNNEL_TOKEN:${NC}"
  echo $TUNNEL_TOKEN
  
  read -p "¿Quieres iniciar el túnel ahora? (s/n): " confirm
  if [[ $confirm == "s" || $confirm == "S" ]]; then
    echo "Iniciando túnel..."
    cloudflared tunnel run --config config.yml $TUNNEL_ID
  else
    echo "Puedes iniciar el túnel más tarde con: cloudflared tunnel run --config config.yml $TUNNEL_ID"
  fi
}

# Ejecuta la opción seleccionada
case $option in
  1)
    setup_gcp_auth
    run_terraform
    build_docker
    deploy_cloud_run
    ;;
  2)
    setup_gcp_auth
    run_terraform
    ;;
  3)
    setup_gcp_auth
    build_docker
    ;;
  4)
    setup_gcp_auth
    deploy_cloud_run
    ;;
  5)
    setup_cloudflare_tunnel
    ;;
  q)
    echo "Saliendo..."
    exit 0
    ;;
  *)
    echo -e "${RED}Opción inválida${NC}"
    exit 1
    ;;
esac

# Limpieza
if [ -f /tmp/gcp-key.json ]; then
  rm /tmp/gcp-key.json
fi

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}Pipeline completado${NC}"
echo -e "${BLUE}==============================================${NC}"
