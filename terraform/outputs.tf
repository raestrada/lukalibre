output "cloud_sql_connection_name" {
  description = "The full connection name for Cloud SQL proxy or private IP"
  value       = google_sql_database_instance.lukalibre_db.connection_name
}
