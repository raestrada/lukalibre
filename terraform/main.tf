provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_sql_database_instance" "lukalibre_db" {
  name             = "lukalibre-db-${var.environment}"
  database_version = "POSTGRES_14"
  region           = var.region
  deletion_protection = false
  
  settings {
    tier = "db-f1-micro" # Tier gratuito
    availability_type = "ZONAL"
    
    backup_configuration {
      enabled = true
      point_in_time_recovery_enabled = true
    }
    
    ip_configuration {
      ipv4_enabled = true
      # Si quieres que sea privado, puedes usar private_network
      # private_network = google_compute_network.private_network.id
      # y no habilitar ipv4
      
      # Para mayor seguridad, limitar acceso solo a rangos específicos
      authorized_networks {
        name  = "cloudrun"
        value = "0.0.0.0/0" # Esto permite acceso desde cualquier lugar, puede ser limitado luego
      }
    }
  }
}

resource "google_sql_database" "database" {
  name     = "lukalibre"
  instance = google_sql_database_instance.lukalibre_db.name
}

resource "google_sql_user" "user" {
  name     = "lukalibre_app"
  instance = google_sql_database_instance.lukalibre_db.name
  password = var.db_password != "" ? var.db_password : random_password.db_password[0].result
}

resource "random_password" "db_password" {
  count   = var.db_password == "" ? 1 : 0
  length  = 16
  special = false
}

# Outputs para usar en el despliegue
output "db_instance_name" {
  value = google_sql_database_instance.lukalibre_db.name
}

output "db_name" {
  value = google_sql_database.database.name
}

output "db_username" {
  value = google_sql_user.user.name
}

output "db_password" {
  value     = var.db_password != "" ? var.db_password : random_password.db_password[0].result
  sensitive = true
}

output "db_connection_string" {
  value     = "postgresql://${google_sql_user.user.name}:${var.db_password != "" ? var.db_password : random_password.db_password[0].result}@${google_sql_database_instance.lukalibre_db.first_ip_address}:5432/${google_sql_database.database.name}"
  sensitive = true
}

output "db_host" {
  value = google_sql_database_instance.lukalibre_db.first_ip_address
}

output "db_port" {
  value = "5432"
}
