# DentiCare Pro - Superadmin Control Room (Standalone)

This is a standalone deployment of the DentiCare Pro Control Room for superadmins. It connects to the same Supabase database as the main DentiCare application.

## Deployment Options

### Option 1: Subdomain Deployment (Recommended)

Deploy to a subdomain like `admin.denticare.pro` or `controlroom.denticare.pro`:

1. **Create a new Vercel project**
   ```bash
   cd superadmin
   npx vercel
   ```

2. **Configure domain**
   - In Vercel dashboard, go to Settings → Domains
   - Add `admin.yourdomain.com` or `controlroom.yourdomain.com`
   - Add the DNS records as instructed

3. **Set environment variables** in Vercel:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Option 2: Subfolder Deployment

Deploy to a subfolder like `yoursite.com/superadmin`:

1. Update `vite.config.ts`:
   ```ts
   export default defineConfig({
     base: '/superadmin/',
     // ...
   })
   ```

2. Deploy and configure your hosting to serve from that path

## Database Setup

The controlroom schema is in `supabase/migrations/20260324000000_controlroom_schema.sql`.

If you're connecting to an existing DentiCare database, run this migration first:

1. Go to your Supabase project's SQL Editor
2. Copy and paste the contents of `supabase/migrations/20260324000000_controlroom_schema.sql`
3. Run the migration

## Local Development

```bash
cd superadmin
npm install
npm run dev
```

## Project Structure

```
superadmin/
├── src/
│   ├── components/
│   │   ├── controlroom/
│   │   │   └── ControlRoomLayout.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── badge.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── select.tsx
│   │       ├── textarea.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── label.tsx
│   ├── pages/
│   │   └── controlroom/
│   │       ├── ControlRoomDashboard.tsx
│   │       ├── ClinicRegistry.tsx
│   │       ├── UserManagement.tsx
│   │       ├── WhatsAppHub.tsx
│   │       ├── OtpSettings.tsx
│   │       ├── IncidentManagement.tsx
│   │       ├── AnnouncementsManager.tsx
│   │       ├── AuditLogExplorer.tsx
│   │       └── IntegrationVault.tsx
│   ├── integrations/
│   │   └── supabase/
│   │       └── client.ts
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   └── utils.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 20260324000000_controlroom_schema.sql
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key (safe to expose) |

## Features

- **SA-1 Command Dashboard** - Platform overview and metrics
- **SA-2 Clinic Registry** - Manage registered dental clinics
- **SA-3 User Management** - Superadmin account management
- **SA-4 WhatsApp Hub** - WhatsApp Business API connections
- **SA-5 OTP Settings** - Configure OTP providers
- **SA-6 Incident Management** - Track platform incidents
- **SA-7 Announcements Manager** - Platform-wide announcements
- **SA-8 Audit Log Explorer** - Searchable audit trail
- **SA-9 Integration Credentials Vault** - Secure API key management

## Security

- Row Level Security (RLS) is enabled on all controlroom tables
- JWT-based authentication via Supabase
- TOTP-based 2FA for superadmin accounts
- Audit logging for all sensitive operations

## License

Proprietary - DentiCare Pro