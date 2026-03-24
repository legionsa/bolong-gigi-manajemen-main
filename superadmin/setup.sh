#!/bin/bash

# DentiCare Superadmin Setup Script
# Run this script from the superadmin directory to copy all needed files

set -e

MAIN_PROJECT="../"
SUPERADMIN_DIR="."

echo "Setting up DentiCare Superadmin standalone project..."

# Copy supabase client
echo "Copying supabase client..."
mkdir -p "$SUPERADMIN_DIR/src/integrations/supabase"
cp "$MAIN_PROJECT/src/integrations/supabase/client.ts" "$SUPERADMIN_DIR/src/integrations/supabase/"

# Copy hooks
echo "Copying hooks..."
mkdir -p "$SUPERADMIN_DIR/src/hooks"
cp "$MAIN_PROJECT/src/hooks/use-toast.ts" "$SUPERADMIN_DIR/src/hooks/"

# Copy lib/utils
echo "Copying utils..."
mkdir -p "$SUPERADMIN_DIR/src/lib"
cp "$MAIN_PROJECT/src/lib/utils.ts" "$SUPERADMIN_DIR/src/lib/"

# Copy UI components
echo "Copying UI components..."
mkdir -p "$SUPERADMIN_DIR/src/components/ui"
for file in button input badge card dialog select textarea switch tabs label; do
  if [ -f "$MAIN_PROJECT/src/components/ui/${file}.tsx" ]; then
    cp "$MAIN_PROJECT/src/components/ui/${file}.tsx" "$SUPERADMIN_DIR/src/components/ui/"
  fi
done

# Copy controlroom components
echo "Copying controlroom components..."
mkdir -p "$SUPERADMIN_DIR/src/components/controlroom"
cp "$MAIN_PROJECT/src/components/controlroom/ControlRoomLayout.tsx" "$SUPERADMIN_DIR/src/components/controlroom/"
cp "$MAIN_PROJECT/src/components/controlroom/index.ts" "$SUPERADMIN_DIR/src/components/controlroom/"

# Copy controlroom pages
echo "Copying controlroom pages..."
mkdir -p "$SUPERADMIN_DIR/src/pages/controlroom"
for file in ControlRoomDashboard ClinicRegistry UserManagement WhatsAppHub OtpSettings IncidentManagement AnnouncementsManager AuditLogExplorer IntegrationVault; do
  if [ -f "$MAIN_PROJECT/src/pages/controlroom/${file}.tsx" ]; then
    cp "$MAIN_PROJECT/src/pages/controlroom/${file}.tsx" "$SUPERADMIN_DIR/src/pages/controlroom/"
  fi
done

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. cd superadmin"
echo "2. npm install"
echo "3. npm run dev"