output "vm_name" {
  description = "The name of the VM running the application"
  value       = google_compute_instance.app_vm.name
}

output "cloudflare_domain" {
  description = "Dominio Cloudflare configurado para acceder a la API"
  value       = var.api_domain
}

output "tunnel_id" {
  description = "ID del túnel de Cloudflare configurado"
  value       = var.tunnel_id
}
