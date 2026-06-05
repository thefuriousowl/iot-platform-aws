# Data module: managed RDS PostgreSQL (TimescaleDB extension) in isolated data subnets,
# plus an S3 bucket for cold telemetry with a lifecycle policy.

variable "name" { type = string }
variable "vpc_id" { type = string }
variable "data_subnet_ids" { type = list(string) }
variable "app_security_group_id" { type = string }
variable "multi_az" {
  type    = bool
  default = false
}
variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

# --- Security group: only the app SG may reach Postgres ---
resource "aws_security_group" "db" {
  name_prefix = "${var.name}-db-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres from app tier only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group_id] # SG-to-SG, not CIDR
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.name}-db-sg" }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnets"
  subnet_ids = var.data_subnet_ids
  tags       = { Name = "${var.name}-db-subnets" }
}

resource "aws_db_instance" "this" {
  identifier              = "${var.name}-timescale"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100 # storage autoscaling
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  multi_az                = var.multi_az
  storage_encrypted       = true
  backup_retention_period = 7
  deletion_protection     = false # true in real prod
  skip_final_snapshot     = true  # false in real prod
  apply_immediately       = true
  username                = "iotadmin"
  password                = "TempPass123Dev" # Temp password. Use secret manager on prod 
  # TimescaleDB enabled via parameter group + post-create `CREATE EXTENSION`.
  tags = { Name = "${var.name}-timescale" }
}

# --- S3 cold storage with lifecycle ---
resource "aws_s3_bucket" "cold" {
  bucket = "${var.name}-telemetry-cold"
  tags   = { Name = "${var.name}-telemetry-cold" }
}

resource "aws_s3_bucket_public_access_block" "cold" {
  bucket                  = aws_s3_bucket.cold.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "cold" {
  bucket = aws_s3_bucket.cold.id
  rule {
    id     = "age-telemetry"
    status = "Enabled"

    filter {}
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    expiration {
      days = 730 # 2-year retention; adjust to compliance needs
    }
  }
}

output "db_endpoint" { value = aws_db_instance.this.endpoint }
output "db_security_group_id" { value = aws_security_group.db.id }
output "cold_bucket_arn" { value = aws_s3_bucket.cold.arn }
output "cold_bucket_name" { value = aws_s3_bucket.cold.id }
