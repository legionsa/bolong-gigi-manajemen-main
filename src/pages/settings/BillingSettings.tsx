import { useState } from 'react';
import { useAccountTier } from '@/hooks/useAccountTier';
import { usePermissions } from '@/hooks/usePermissions';
import { useClinicUser } from '@/hooks/useClinicUser';
import { UpgradeModal } from '@/components/UpgradeModal';
import { UsageBar } from '@/components/UsageBar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';

export const BillingSettings = () => {
  const { accountTier, isLoading } = useAccountTier();
  const { can, isAdmin } = usePermissions();
  const { clinicUser } = useClinicUser();
  const { toast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  if (!isAdmin) return null;  // Only admins see billing

  if (isLoading || !accountTier) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    pro_trial: 'bg-amber-100 text-amber-700',
    pro: 'bg-primary/10 text-primary',
    enterprise: 'bg-purple-100 text-purple-700',
  };

  const tierLabels: Record<string, string> = {
    free: 'Free',
    pro_trial: `Pro Trial (${accountTier.trialDaysRemaining} hari)`,
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    setIsUpgrading(true);
    try {
      // Call edge function to get Midtrans Snap token
      const { data, error } = await supabase.functions.invoke('create-snap-token', {
        body: { plan, accountId: accountTier.accountId }
      });

      if (error || !data?.snap_token) {
        throw new Error(error?.message || 'Failed to get payment token');
      }

      // Open Midtrans Snap popup
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(data.snap_token, {
          onSuccess: async (result: any) => {
            toast({ title: "Pembayaran Berhasil!", description: "Akun kamu sekarang Pro." });
            window.location.reload();
          },
          onPending: (result: any) => {
            toast({ title: "Pembayaran Pending", description: "Menunggu konfirmasi pembayaran." });
          },
          onError: (result: any) => {
            toast({ title: "Pembayaran Gagal", description: "Silakan coba lagi.", variant: "destructive" });
          },
        });
      } else {
        // Fallback: show mock success for dev
        toast({ title: "Development Mode", description: "Midtrans Snap not loaded — would open payment popup." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-primary">Pengaturan Billing</h2>
        <p className="text-on-surface-variant mt-1">Kelola paket dan batas penggunaan</p>
      </div>

      {/* Current Plan Card */}
      <Card className="bg-surface-container-low border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className={`w-6 h-6 ${accountTier.isPro ? 'text-primary' : 'text-gray-400'}`} />
              <div>
                <CardTitle className="text-on-surface">Paket Saat Ini</CardTitle>
                <Badge className={`mt-1 ${planColors[accountTier.effectiveTier]}`}>
                  {tierLabels[accountTier.effectiveTier]}
                </Badge>
              </div>
            </div>
            {!accountTier.isFree && !accountTier.isTrial && (
              <p className="text-xs text-on-surface-variant">
                Berakhir: {accountTier.tierExpiresAt ? new Date(accountTier.tierExpiresAt).toLocaleDateString('id-ID') : 'Tidak terbatas'}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accountTier.isFree ? (
            <div className="space-y-2">
              <p className="text-sm text-on-surface">
                ✅ Akses tak terbatas ke semua fitur Pro
              </p>
              <p className="text-xs text-on-surface-variant">
                Tagihan renouvel setiap bulan atau tahun.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-on-surface">
                Upgrade ke Pro untuk membuka semua fitur dan batas tak terbatas.
              </p>
              <div className="flex gap-3">
                <Button variant="medical" onClick={() => setShowUpgradeModal(true)} className="flex-1 gap-2">
                  <Crown className="w-4 h-4" />
                  Upgrade ke Pro
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card className="bg-surface-container-low border-0">
        <CardHeader>
          <CardTitle className="text-on-surface text-base">Penggunaan</CardTitle>
          <CardDescription>Batas penggunaan paket Free kamu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <UsageBar
            label="Dokter"
            used={1}  // Would be fetched from actual count
            max={accountTier.limits.max_doctors_per_clinic}
          />
          <UsageBar
            label="Front Desk"
            used={1}
            max={accountTier.limits.max_front_desk_per_clinic}
          />
          <UsageBar
            label="Admin"
            used={1}
            max={accountTier.limits.max_admins_per_clinic}
          />
          <UsageBar
            label="Klinik"
            used={accountTier.limits.max_clinics === -1 ? 0 : 1}
            max={accountTier.limits.max_clinics}
          />
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        type="feature_lock"
        featureName="Pro"
        featureBenefits={[
          "Semua fitur Free",
          " unlimited dokter & staf",
          "WhatsApp Reminders otomatis",
          "BPJS Integration",
          "AI Clinical Notes",
          "Export data (CSV/PDF)",
          "Analitik penuh",
          "25 GB storage",
        ]}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          handleUpgrade('monthly');
        }}
      />
    </div>
  );
};