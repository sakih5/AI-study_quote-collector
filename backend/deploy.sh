#!/bin/bash

# FastAPI to Cloud Run Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FastAPI Deployment to Cloud Run${NC}"
echo -e "${GREEN}========================================${NC}"

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"asia-northeast1"}
SERVICE_NAME="quote-collector-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}GCP_PROJECT_ID is not set${NC}"
    echo -e "${YELLOW}Please set it:${NC}"
    echo "  export GCP_PROJECT_ID=your-project-id"
    echo "Or run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Confirm deployment
echo -e "${YELLOW}Deployment Configuration:${NC}"
echo "  Project ID:   ${PROJECT_ID}"
echo "  Region:       ${REGION}"
echo "  Service Name: ${SERVICE_NAME}"
echo "  Image:        ${IMAGE_NAME}"
echo ""
read -p "Continue with deployment? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Step 1: Build Docker image
echo -e "${GREEN}Step 1: Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

# Step 2: Deploy to Cloud Run
echo -e "${GREEN}Step 2: Deploying to Cloud Run...${NC}"

# === gcloud run services describeで取得できるアプリのURLが旧型式のため、止める ===
# gcloud run deploy ${SERVICE_NAME} \
#   --image ${IMAGE_NAME} \
#   --platform managed \
#   --region ${REGION} \
#   --allow-unauthenticated \
#   --set-env-vars="SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY}" \
#   --project ${PROJECT_ID}

# # Get service URL
# SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
#   --platform managed \
#   --region ${REGION} \
#   --project ${PROJECT_ID} \
#   --format 'value(status.url)')
# === gcloud run services describeで取得できるアプリのURLが旧型式のため、止める ===

# === gcloud run services describeで取得できるアプリのURLが旧型式のため、止める → 修正後 ===
SERVICE_URL=$(gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_URL=${SUPABASE_URL},SUPABASE_KEY=${SUPABASE_KEY}" \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')
# === gcloud run services describeで取得できるアプリのURLが旧型式のため、止める → 修正後 ===

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo ""
echo "Test the API:"
echo "  curl ${SERVICE_URL}/health"
echo "  curl ${SERVICE_URL}/docs"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update NEXT_PUBLIC_API_URL in Next.js (.env.local)"
echo "2. Deploy Next.js to Vercel"
echo "3. Test end-to-end functionality"
