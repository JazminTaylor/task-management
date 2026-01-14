#!/bin/bash
set -e

echo "🚀 Deploying Task Management API"

# 1. Build images
echo "📦 Building Docker images..."
docker build -t task-management-api:latest .
docker build -t task-management-pgbouncer:latest docker/pgbouncer/

# 2. Tag for ECR
ECR_URL="387158738345.dkr.ecr.eu-west-2.amazonaws.com"
docker tag task-management-api:latest $ECR_URL/task-management-api:latest
docker tag task-management-pgbouncer:latest $ECR_URL/task-management-pgbouncer:latest

# 3. Push to ECR
echo "📤 Pushing to ECR..."
docker push $ECR_URL/task-management-api:latest
docker push $ECR_URL/task-management-pgbouncer:latest

# 4. Apply Terraform
echo "🏗️ Applying Terraform..."
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
cd ..

# 5. Deploy ECS service
echo "🚀 Updating ECS service..."
aws ecs update-service \
  --cluster task-management-production-cluster \
  --service task-management-production-api-service \
  --force-new-deployment \
  --region eu-west-2

echo "✅ Deployment complete!"
echo "API: $(terraform output -raw alb_dns_name)"
echo "Frontend: $(terraform output -raw cloudfront_domain_name)"
