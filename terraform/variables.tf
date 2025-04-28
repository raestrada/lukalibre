variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The region where resources will be created"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_password" {
  description = "The database password (if empty, a random one will be generated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cloudflare_tunnel_token" {
  description = "Token para el túnel de Cloudflare (opcional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tunnel_id" {
  description = "ID del túnel de Cloudflare (opcional)"
  type        = string
  default     = ""
}

variable "api_domain" {
  description = "Dominio para la API (ej: api.lukalibre.org)"
  type        = string
  default     = ""
}
