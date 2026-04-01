#!/bin/bash
# DentiCare Pro - pg_cron Setup Script
# Run this after Edge Functions are deployed

set -e

echo "=========================================="
echo "DentiCare Pro - pg_cron Setup"
echo "=========================================="

PROJECT_ID="xktgxrdpmoilsbiadzej"

# Check if Supabase CLI is installed and logged in
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed."
    echo "Install it with: brew install supabase"
    exit 1
fi

if ! supabase projects list &> /dev/null; then
    echo "Not logged in. Please run: supabase login"
    exit 1
fi

echo ""
echo "Applying pg_cron migration..."
echo ""

# Push the migration to the remote database
supabase db push --project-id $PROJECT_ID

echo ""
echo "=========================================="
echo "pg_cron setup complete!"
echo "=========================================="
echo ""
echo "Scheduled Jobs:"
echo "  - appointment-reminders: Every 15 minutes"
echo "  - nps-surveys: Every hour"
echo "  - recall-campaigns: Daily at 9 AM"
echo ""
echo "You can verify in Supabase Dashboard > SQL Editor:"
echo "  SELECT * FROM cron.job ORDER BY jobname;"
