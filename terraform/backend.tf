terraform {
  backend "gcs" {
    # Este bucket debe ser creado previamente
    # bucket = "lukalibre-terraform-state"
    # prefix = "terraform/state"
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
