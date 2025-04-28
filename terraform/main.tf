provider "google" {
  project = var.project_id
  region  = var.region
}

# Red VPC para la VM
resource "google_compute_network" "vpc_network" {
  name                    = "lukalibre-network-${var.environment}"
  auto_create_subnetworks = "true"
}

# Nota: Usamos IP pública en la VM con firewall restringido para permitir tráfico saliente
# sin exponer servicios

# Firewall para bloquear TODO el tráfico entrante por defecto
# Todo el acceso a la app se gestiona exclusivamente a través del túnel Cloudflare
resource "google_compute_firewall" "deny_all_ingress" {
  name      = "lukalibre-deny-all-${var.environment}"
  network   = google_compute_network.vpc_network.name
  direction = "INGRESS"
  priority  = 1000  # Prioridad máxima (se aplica primero)
  
  # Denegar todo tipo de tráfico
  deny {
    protocol = "all"
  }
  
  # Bloquear acceso desde cualquier origen externo
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["lukalibre-app"]
}

# Firewall para permitir acceso a la API backend y PostgreSQL SOLO desde la red interna
resource "google_compute_firewall" "app_internal_firewall" {
  name      = "lukalibre-app-internal-${var.environment}"
  network   = google_compute_network.vpc_network.name
  direction = "INGRESS"
  priority  = 800
  
  allow {
    protocol = "tcp"
    ports    = ["8000", "5432", "80", "443"]
  }
  
  # Solo permitir tráfico desde la red interna de GCP
  source_ranges = ["10.0.0.0/8"]
  target_tags   = ["lukalibre-app"]
}

# SSH para administración (esencial para debugging y mantenimiento)
# Mantenemos esta regla con una prioridad más alta que la de deny_all_ingress
# para asegurar que siempre podamos acceder a la VM
resource "google_compute_firewall" "ssh" {
  name      = "lukalibre-ssh-firewall-${var.environment}"
  network   = google_compute_network.vpc_network.name
  direction = "INGRESS"
  priority  = 900  # Mayor que la regla deny_all para permitir este acceso

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Idealmente, aquí restringirías a tu IP específica para mayor seguridad
  # source_ranges = ["TU_IP_PUBLICA/32"]
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh"]
}

# Generar la contraseña para PostgreSQL si no se proporciona
resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 16
  special = false
}

locals {
  db_password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  db_name     = "lukalibre"
  db_user     = "lukalibre_app"
}

# VM e2-micro con PostgreSQL y API en la misma instancia
resource "google_compute_instance" "app_vm" {
  name         = "lukalibre-app-${var.environment}"
  machine_type = "e2-micro"  # Tier gratuito permanente
  zone         = "${var.region}-a"
  tags         = ["lukalibre-app", "ssh"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2004-lts"
      size  = 30  # Mayor espacio para aplicación y datos
    }
  }

  # Esta VM es parte de la capa gratuita de GCP
  scheduling {
    preemptible         = false
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
  }

  network_interface {
    network = google_compute_network.vpc_network.name
    # IP efímera para permitir acceso a Internet sin costo adicional
    # Todo el acceso sigue siendo via Cloudflare Tunnel para seguridad
    access_config {
      # Sin especificar un nat_ip, GCP asigna una IP efímera sin costo
    }
  }

  # Script de inicio para instalar Docker y configurar la aplicación
  metadata_startup_script = <<-EOT
    #!/bin/bash
    set -e
    
    echo "Iniciando script de configuración de VM para LukaLibre..."
    
    # Actualizar el sistema
    echo "Actualizando sistema..."
    apt-get update
    apt-get upgrade -y
    
    # Instalar Docker y Git
    echo "Instalando Docker y Git..."
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common git
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl enable docker
    
    # Directorio para la aplicación
    echo "Preparando directorios..."
    mkdir -p /opt/lukalibre
    
    # Clonar repositorio - usando enlace absoluto para asegurar que es correcto
    echo "Clonando repositorio..."
    cd /opt
    if [ ! -d "/opt/lukalibre" ]; then
      git clone --depth=1 https://github.com/raestrada/lukalibre.git lukalibre
    else
      echo "El directorio ya existe, probando git pull..."
      cd /opt/lukalibre
      git pull
    fi
    
    # Verificar que se clonaron los archivos
    if [ ! -d "/opt/lukalibre/backend" ]; then
      echo "ERROR: No se encontró el directorio /opt/lukalibre/backend"
      echo "Intentando clonar nuevamente con menos profundidad..."
      rm -rf /opt/lukalibre
      git clone https://github.com/raestrada/lukalibre.git /opt/lukalibre
    fi
    
    # Crear archivo de variables de entorno
    echo "Configurando variables de entorno..."
    mkdir -p /opt/lukalibre/backend/
    cat > /opt/lukalibre/backend/.env << EOF
    DB_USER=${local.db_user}
    DB_PASSWORD=${local.db_password}
    DB_NAME=${local.db_name}
    DB_HOST=localhost
    DB_PORT=5432
    DATABASE_URL=postgresql://${local.db_user}:${local.db_password}@localhost:5432/${local.db_name}
    CLOUDFLARE_TUNNEL_TOKEN='${var.cloudflare_tunnel_token}'
    TUNNEL_ID=${var.tunnel_id}
    API_DOMAIN=${var.api_domain}
    EOF
    
    # Construir y ejecutar la imagen Docker unificada
    echo "Preparando Docker para la aplicación..."
    cd /opt/lukalibre/backend
    
    # Verificar que existe Dockerfile.vm
    if [ ! -f "Dockerfile.vm" ]; then
      echo "No se encuentra Dockerfile.vm, verificando estructura del repositorio..."
      find /opt/lukalibre -name "Dockerfile*" | sort
      echo "Creando scripts necesarios si no existen..."
      
      # Crear directorio de scripts si no existe
      mkdir -p /opt/lukalibre/backend/scripts
      
      # Crear supervisord.conf si no existe
      if [ ! -f "/opt/lukalibre/backend/scripts/supervisord.conf" ]; then
        echo "Creando archivo de configuración para supervisor..."
        cat > /opt/lukalibre/backend/scripts/supervisord.conf << 'EOFS'
[supervisord]
nodaemon=true
logfile=/var/log/supervisord.log
logfile_maxbytes=50MB
logfile_backups=10

[program:postgresql]
command=/start-services.sh postgres
priority=10
autostart=true
autorestart=true
stdout_logfile=/var/log/postgres.log
stderr_logfile=/var/log/postgres-err.log

[program:api]
command=/start-services.sh api
priority=20
autostart=true
autorestart=true
stdout_logfile=/var/log/api.log
stderr_logfile=/var/log/api-err.log

[program:cloudflared]
command=/start-services.sh cloudflared
priority=30
autostart=true
autorestart=true
stdout_logfile=/var/log/cloudflared.log
stderr_logfile=/var/log/cloudflared-err.log
EOFS
      fi
      
      # Crear start-services.sh si no existe
      if [ ! -f "/opt/lukalibre/backend/scripts/start-services.sh" ]; then
        echo "Creando script de inicio de servicios..."
        cat > /opt/lukalibre/backend/scripts/start-services.sh << 'EOFSS'
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
  while ! pg_isready -h localhost -U "$DB_USER" -d "$DB_NAME"; do
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
EOFSS
        chmod +x /opt/lukalibre/backend/scripts/start-services.sh
      fi
      
      # Crear Dockerfile.vm si no existe
      if [ ! -f "/opt/lukalibre/backend/Dockerfile.vm" ]; then
        echo "Creando Dockerfile.vm..."
        cat > /opt/lukalibre/backend/Dockerfile.vm << 'EOFD'
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema y PostgreSQL
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-15 \
    postgresql-contrib-15 \
    supervisor \
    curl \
    netcat-traditional \
    gnupg \
    lsb-release && \
    rm -rf /var/lib/apt/lists/*
    
# Instalar cloudflared para el túnel de Cloudflare
RUN curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

# Configurar PostgreSQL
USER postgres
RUN /etc/init.d/postgresql start && \
    psql --command "CREATE USER lukalibre_app WITH SUPERUSER PASSWORD 'lukalibre_password';" && \
    createdb -O lukalibre_app lukalibre && \
    /etc/init.d/postgresql stop

USER root

# Instalar Poetry
RUN pip install poetry==1.7.1 && \
    poetry config virtualenvs.create false

# Copiar archivos de dependencias
COPY pyproject.toml poetry.lock ./

# Instalar dependencias de Python
RUN poetry install --no-interaction --no-ansi --no-dev

# Copiar el resto de la aplicación
COPY . .

# Script de inicio para configurar la base de datos con variables de entorno
COPY scripts/start-services.sh /start-services.sh
RUN chmod +x /start-services.sh

# Configuración del supervisor para manejar múltiples procesos
COPY scripts/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000 5432

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
EOFD
      fi
    fi
    
    echo "Construyendo la imagen Docker..."
    docker build -t lukalibre-app:latest -f Dockerfile.vm .
    
    # Detener contenedor existente si existe
    docker stop lukalibre-app || true
    docker rm lukalibre-app || true
    
    # Crear directorio para datos persistentes
    mkdir -p /data/postgres
    chmod 777 /data/postgres
    
    echo "Ejecutando contenedor con la aplicación y base de datos..."
    # Ejecutar contenedor con la aplicación, base de datos y túnel
    docker run -d --name lukalibre-app \
      -p 8000:8000 -p 5432:5432 \
      -v /data/postgres:/var/lib/postgresql/15/main \
      -e DB_USER=${local.db_user} \
      -e DB_PASSWORD=${local.db_password} \
      -e DB_NAME=${local.db_name} \
      -e DB_HOST=localhost \
      -e DB_PORT=5432 \
      -e DATABASE_URL=postgresql://${local.db_user}:${local.db_password}@localhost:5432/${local.db_name} \
      -e CLOUDFLARE_TUNNEL_TOKEN='${var.cloudflare_tunnel_token}' \
      -e TUNNEL_ID=${var.tunnel_id} \
      -e API_DOMAIN=${var.api_domain} \
      --restart always \
      lukalibre-app:latest
      
    # Verificar que el contenedor está corriendo
    docker ps
    echo "Aplicación desplegada exitosamente con PostgreSQL y Cloudflare tunnel incluidos"
    
    # Configuración de Cloudflare Tunnel (obligatorio para acceso)
    # Instalar cloudflared
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
    dpkg -i cloudflared.deb
    
    # Configurar Cloudflare Tunnel
    mkdir -p /etc/cloudflared
    echo "tunnel: ${var.tunnel_id}" > /etc/cloudflared/config.yml
    echo "credentials-file: /etc/cloudflared/cert.json" >> /etc/cloudflared/config.yml
    echo "ingress:" >> /etc/cloudflared/config.yml
    echo "  - hostname: ${var.api_domain}" >> /etc/cloudflared/config.yml
    echo "    service: http://localhost:8000" >> /etc/cloudflared/config.yml
    echo "  - service: http_status:404" >> /etc/cloudflared/config.yml
    
    # Guardar token del túnel
    echo '${var.cloudflare_tunnel_token}' > /etc/cloudflared/cert.json
    
    # Crear servicio systemd para cloudflared
    cat > /etc/systemd/system/cloudflared.service << 'CFEOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/cloudflared tunnel run
Restart=always
RestartSec=10
StartLimitInterval=0

[Install]
WantedBy=multi-user.target
CFEOF

    # Habilitar e iniciar el servicio
    systemctl daemon-reload
    systemctl enable cloudflared
    systemctl start cloudflared
  EOT
}

# Outputs para usar en el despliegue
output "db_instance_name" {
  value = google_compute_instance.app_vm.name
}

output "db_name" {
  value = local.db_name
}

output "db_username" {
  value = local.db_user
}

output "db_password" {
  value     = local.db_password
  sensitive = true
}

output "db_connection_string" {
  value     = "postgresql://${local.db_user}:${local.db_password}@localhost:5432/${local.db_name}"
  sensitive = true
}

output "db_host" {
  value = "localhost"
}

output "db_port" {
  value = "5432"
}
