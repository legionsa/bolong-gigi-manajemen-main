#!/bin/bash
# DentiCare Pro - Edge Functions Deployment Script

set -e

echo "=========================================="
echo "DentiCare Pro - Edge Functions Deployment"
echo "=========================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed."
    echo "Install it with: brew install supabase"
    exit 1
fi

# Check if logged in
echo ""
echo "Step 1: Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "Not logged in. Please run: supabase login"
    echo "Then run this script again."
    exit 1
fi

PROJECT_ID="xktgxrdpmoilsbiadzej"

# Link project (if not already linked)
echo ""
echo "Step 2: Linking Supabase project..."
supabase link --project-id $PROJECT_ID

# Deploy Edge Functions
echo ""
echo "Step 3: Deploying Edge Functions..."
echo ""

echo "Deploying send-reminder..."
supabase functions deploy send-reminder --project-id $PROJECT_ID

echo "Deploying process-webhook..."
supabase functions deploy process-webhook --project-id $PROJECT_ID

echo "Deploying patient-otp..."
supabase functions deploy patient-otp --project-id $PROJECT_ID

echo ""
echo "=========================================="
echo "Edge Functions deployed successfully!"
echo "=========================================="
