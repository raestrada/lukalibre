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
  echo -e "TERRAFORM_TOKEN=<token-de-terraform-cloud>"
  echo -e "TUNNEL_ID=tu-id-de-tunnel"
  exit 1
fi

# Carga variables desde .secrets
echo "Cargando variables de entorno desde .secrets..."
source .secrets
export GCP_PROJECT_ID
export GCP_REGION
export CLOUDFLARE_TUNNEL_TOKEN
export API_DOMAIN
export GCP_SA_KEY
export DB_PASSWORD
export TERRAFORM_TOKEN
export TUNNEL_ID

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

# Menú de opciones
echo "Selecciona qué parte del pipeline quieres ejecutar:"
echo "1) Ejecutar todo el pipeline"
echo "2) Solo Terraform (infraestructura)"
echo "3) Solo Docker Build (backend)"
echo "4) Construir imagen VM all-in-one (Docker + PostgreSQL + API)"
echo "5) Crear/configurar Cloudflare Tunnel"
echo "q) Salir"

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
  
  # Verificar que tenemos el token de Terraform Cloud
  if [ -z "$TERRAFORM_TOKEN" ]; then
    echo -e "${RED}Error: No se encontró el token de Terraform Cloud en .secrets${NC}"
    echo "Agrega la variable TERRAFORM_TOKEN en el archivo .secrets"
    return 1
  fi
  
  # Configurar Terraform CLI con el token
  echo -e "${YELLOW}Configurando credenciales para Terraform Cloud...${NC}"
  cat > ~/.terraformrc <<EOF
credentials "app.terraform.io" {
  token = "$TERRAFORM_TOKEN"
}
EOF
  
  # Verificar que el backend.tf ya está configurado para Terraform Cloud
  if ! grep -q "cloud {" terraform/backend.tf; then
    echo -e "${YELLOW}Configurando backend para Terraform Cloud...${NC}"
    cat > terraform/backend.tf <<EOF
terraform {
  cloud {
    organization = "lukalibre"

    workspaces {
      name = "backend"
    }
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
  fi

  cd terraform
  echo "Inicializando Terraform..."
  terraform init
  
  echo "Ejecutando Terraform plan..."
  terraform plan -var="project_id=$GCP_PROJECT_ID" \
               -var="region=$GCP_REGION" \
               -var="environment=$VERSION" \
               -var="db_password=$DB_PASSWORD" \
               -var="cloudflare_tunnel_token=$CLOUDFLARE_TUNNEL_TOKEN" \
               -var="tunnel_id=$TUNNEL_ID" \
               -var="api_domain=$API_DOMAIN" \
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

# Función para construir la imagen all-in-one
build_vm_image() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Construyendo imagen VM all-in-one...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  # Verificar que exista el Dockerfile.vm
  if [ ! -f ./backend/Dockerfile.vm ]; then
    echo -e "${RED}Error: No se encontró el archivo Dockerfile.vm${NC}"
    return 1
  fi
  
  echo "Construyendo imagen Docker all-in-one..."
  docker build -t lukalibre-all-in-one:$VERSION -f ./backend/Dockerfile.vm ./backend
  
  echo -e "${GREEN}Imagen construida correctamente: lukalibre-all-in-one:$VERSION${NC}"
  echo -e "${YELLOW}Esta imagen contiene PostgreSQL, la API y cloudflared en un solo contenedor${NC}"
  echo -e "${YELLOW}Usa la infraestructura de Terraform para desplegarla en una VM e2-micro${NC}"
  
  # Opcionalmente, podemos subir la imagen a GCR
  read -p "¿Quieres subir la imagen a Container Registry? (s/n): " confirm
  if [[ $confirm == "s" || $confirm == "S" ]]; then
    echo "Configurando Docker para GCR..."
    gcloud auth configure-docker gcr.io --quiet
    
    echo "Etiquetando imagen para GCR..."
    docker tag lukalibre-all-in-one:$VERSION gcr.io/$GCP_PROJECT_ID/lukalibre-all-in-one:$VERSION
    
    echo "Subiendo imagen a GCR..."
    docker push gcr.io/$GCP_PROJECT_ID/lukalibre-all-in-one:$VERSION
    echo -e "${GREEN}Imagen subida correctamente: gcr.io/$GCP_PROJECT_ID/lukalibre-all-in-one:$VERSION${NC}"
  else
    echo "Omitiendo push de la imagen"
  fi
}

# Función para configurar Cloudflare Tunnel
setup_cloudflare_tunnel() {
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${GREEN}Configurando Cloudflare Tunnel...${NC}"
  echo -e "${BLUE}==============================================${NC}"
  
  # Verificar si tenemos cloudflared instalado
  if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Instalando cloudflared...${NC}"
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
  fi
  
  echo "Versión de cloudflared:"
  cloudflared version
  
  # Verificar si tenemos el ID del túnel en las variables de entorno
  if [ -z "$TUNNEL_ID" ]; then
    echo -e "${YELLOW}No se encontró el ID del túnel en las variables de entorno.${NC}"
    echo -e "${YELLOW}Agrega la variable TUNNEL_ID a tu archivo .secrets${NC}"
    
    # Preguntar si quiere crear un nuevo túnel
    read -p "¿Quieres crear un nuevo túnel? (s/n): " create_tunnel
    if [[ $create_tunnel != "s" && $create_tunnel != "S" ]]; then
      echo "Cancelando configuración del túnel."
      return
    fi
    
    # Pregunta por el nombre del túnel
    read -p "Nombre del túnel (default: lukalibre-api): " TUNNEL_NAME
    TUNNEL_NAME=${TUNNEL_NAME:-lukalibre-api}
    
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
    NEW_TUNNEL_ID=$(cloudflared tunnel create $TUNNEL_NAME --credentials-file $CERT_FILE)
    NEW_TUNNEL_ID=$(echo $NEW_TUNNEL_ID | grep -oP 'Created tunnel \K[a-z0-9-]+')
    
    if [ -z "$NEW_TUNNEL_ID" ]; then
      echo -e "${RED}Error: No se pudo crear el túnel.${NC}"
      return
    fi
    
    echo "ID del túnel: $NEW_TUNNEL_ID"
    echo -e "${YELLOW}Importante: Agrega este ID a tu archivo .secrets como TUNNEL_ID=$NEW_TUNNEL_ID${NC}"
    
    # Usar el nuevo ID para esta sesión
    TUNNEL_ID=$NEW_TUNNEL_ID
  else
    echo -e "${GREEN}Usando túnel existente con ID: $TUNNEL_ID${NC}"
  fi
  
  # Pregunta por el dominio o usa el de las variables de entorno
  if [ -z "$API_DOMAIN" ]; then
    read -p "Dominio a conectar (default: api.lukalibre.org): " DOMAIN
    DOMAIN=${DOMAIN:-api.lukalibre.org}
  else
    DOMAIN=$API_DOMAIN
    echo "Usando dominio de las variables de entorno: $DOMAIN"
  fi
  
  # Configura la ruta DNS
  echo "Configurando ruta DNS para $DOMAIN..."
  cloudflared tunnel route dns $TUNNEL_ID $DOMAIN
  
  # Crea el archivo de configuración
  CONFIG_DIR="cloudflared"
  mkdir -p $CONFIG_DIR
  
  cat > $CONFIG_DIR/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/credentials.json
ingress:
  - hostname: $DOMAIN
    service: http://localhost:8000
  - service: http_status:404
EOF
  
  echo "Configuración guardada en $CONFIG_DIR/config.yml"
  
  # Verificar si tenemos el token del túnel
  if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo -e "${YELLOW}No se encontró el token del túnel en las variables de entorno.${NC}"
    echo -e "${YELLOW}Se intentará obtener uno desde Cloudflare...${NC}"
    
    # Pregunta por el archivo de certificado para obtener el token
    read -p "Ruta al archivo de certificado Cloudflare (default: ./cert.pem): " CERT_FILE
    CERT_FILE=${CERT_FILE:-./cert.pem}
    
    if [ ! -f "$CERT_FILE" ]; then
      echo -e "${YELLOW}No se encontró el archivo de certificado. Ejecutando login...${NC}"
      cloudflared tunnel login
      CERT_FILE=~/.cloudflared/cert.pem
    fi
    
    # Obtén el token del túnel
    TUNNEL_TOKEN=$(cloudflared tunnel token $TUNNEL_ID --credentials-file $CERT_FILE)
    
    if [ -z "$TUNNEL_TOKEN" ]; then
      echo -e "${RED}Error: No se pudo obtener el token del túnel.${NC}"
      return
    fi
    
    # Actualiza el archivo .secrets con el token del túnel
    echo -e "${YELLOW}¿Quieres añadir/actualizar el token en .secrets?${NC}"
    read -p "Añadir/actualizar token (s/n): " update_token
    if [[ $update_token == "s" || $update_token == "S" ]]; then
      PREV_TOKEN=$(grep -o "CLOUDFLARE_TUNNEL_TOKEN=.*" .secrets 2>/dev/null || echo "")
      if [ -z "$PREV_TOKEN" ]; then
        echo "CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN" >> .secrets
        echo -e "${GREEN}Token del túnel añadido a .secrets${NC}"
      else
        sed -i "s|$PREV_TOKEN|CLOUDFLARE_TUNNEL_TOKEN=$TUNNEL_TOKEN|" .secrets
        echo -e "${GREEN}Token actualizado en .secrets${NC}"
      fi
    fi
  else
    echo -e "${GREEN}Usando token existente del túnel${NC}"
  fi
  
  # Muestra información sobre cómo usar el túnel
  echo -e "\n${GREEN}=== Configuración completada ===${NC}"
  echo -e "ID del túnel: $TUNNEL_ID"
  echo -e "Dominio: $DOMAIN"
  echo -e "\n${YELLOW}Para iniciar el túnel manualmente:${NC}"
  echo -e "cloudflared tunnel run --config $CONFIG_DIR/config.yml"
}

# Ejecuta la opción seleccionada
case $option in
  1)
    setup_gcp_auth
    run_terraform
    build_vm_image
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
    build_vm_image
    ;;
  5)
    setup_gcp_auth
    setup_cloudflare_tunnel
    ;;
  q|Q)
    echo "Saliendo..."
    exit 0
    ;;
  *)
    echo -e "${RED}Opción no válida${NC}"
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
