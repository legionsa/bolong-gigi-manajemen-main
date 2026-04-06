import { useState } from 'react';
import { Lock, AlertTriangle, Sparkles, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  type: 'feature_lock' | 'limit_reached' | 'trial_expired';
  // feature_lock
  featureName?: string;
  featureBenefits?: string[];
  // limit_reached
  limitKey?: string;
  currentCount?: number;
  maxCount?: number;
  // trial_expired
  trialDays?: number;
}

const LIMIT_LABELS: Record<string, string> = {
  max_clinics: 'klinik',
  max_doctors_per_clinic: 'dokter',
  max_front_desk_per_clinic: 'resepsionis',
  max_finance_per_clinic: 'staf finance',
  max_admins_per_clinic: 'admin',
  max_storage_gb: 'penyimpanan',
  max_surat_izin_templates: 'template surat izin',
};

const FEATURE_BENEFITS: Record<string, string[]> = {
  can_whatsapp: [
    'Kirim reminder otomatis ke WhatsApp pasien',
    'Template pesan yang bisa disesuaikan',
    'Reminders 24 jam sebelum appointment',
  ],
  can_export: [
    'Ekspor data pasien ke Excel/CSV',
    'Export laporan keuangan',
    'Download rekam medis',
  ],
  can_bpjs: [
    'Integrasi dengan sistem BPJS',
    'Verifikasi eligibility pasien',
    'Kirim data klaim secara digital',
  ],
  can_ai_notes: [
    'AI-assisted note writing',
    'Template intelligent yang adaptif',
    'Time-saving documentation',
  ],
  can_patient_portal: [
    'Patient portal untuk pasien',
    'Online appointment booking',
    'Hasil lab dan invoice digital',
  ],
};

export function UpgradeModal({
  open,
  onClose,
  onUpgrade,
  type,
  featureName,
  featureBenefits,
  limitKey,
  currentCount,
  maxCount,
  trialDays = 14,
}: UpgradeModalProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: navigate to pricing page or trigger upgrade flow
      window.location.href = '/pricing';
    }
    onClose();
  };

  const limitLabel = limitKey ? LIMIT_LABELS[limitKey] || limitKey : 'item';
  const featureBenefitList = featureName && featureBenefits
    ? featureBenefits
    : featureName && FEATURE_BENEFITS[featureName]
    ? FEATURE_BENEFITS[featureName]
    : ['Fitur premium untuk workflow yang lebih efisien'];

  // Full-screen style for trial_expired
  if (type === 'trial_expired') {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg text-center border-0 bg-gradient-to-b from-primary/5 to-background p-8">
          <DialogHeader className="space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-on-surface">
                Trial Pro kamu telah berakhir
              </DialogTitle>
              <DialogDescription className="text-base mt-2 text-on-surface-variant">
                Klinikmu telah berjalan dengan baik selama {trialDays} hari!
                <br />
                Lanjutkan perjalananmu dengan Pro.
              </DialogDescription>
            </div>
          </DialogHeader>

          <Card className="border-0 shadow-none bg-surface-container-low mt-4">
            <CardContent className="text-left pt-4">
              <p className="text-sm font-semibold text-on-surface mb-3">
                Yang akan berubah jika tetap Free:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Dokter ke-3 dst tidak bisa login
                </li>
                <li className="flex items-center gap-2 text-sm text-error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Reminder WhatsApp dinonaktifkan
                </li>
                <li className="flex items-center gap-2 text-sm text-error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Ekspor data tidak tersedia
                </li>
                <li className="flex items-center gap-2 text-sm text-error">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Analitik terbatas ke 7 hari terakhir
                </li>
              </ul>
            </CardContent>
          </Card>

          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button
              variant="medical"
              size="lg"
              onClick={handleUpgrade}
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade ke Pro — Rp 299.000/bln
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              Lanjutkan dengan Free
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // feature_lock variant
  if (type === 'feature_lock') {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Fitur ini tersedia untuk Pro
              </p>
              <DialogTitle className="text-xl font-bold text-on-surface">
                {featureName || 'Fitur Premium'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <Card className="border-0 shadow-none bg-surface-container-low">
            <CardContent className="pt-4">
              <p className="text-sm text-on-surface-variant mb-4">
                {featureName || 'Fitur ini'} membantu workflow klinikm lebih efisien dan profesional.
              </p>
              <ul className="space-y-2">
                {featureBenefitList.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-on-surface">
                    <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-lg font-bold text-primary mb-4">
              Upgrade ke Pro — Rp 299.000/bulan
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="medical"
              onClick={handleUpgrade}
              className="flex-1"
            >
              Upgrade Sekarang
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Mungkin Nanti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // limit_reached variant
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
              Batas {limitLabel} Free tercapai
            </p>
            <DialogTitle className="text-xl font-bold text-on-surface">
              {maxCount === 0 ? `Tidak ada ${limitLabel}` : `Maksimal ${maxCount} ${limitLabel}`}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Card className="border-0 shadow-none bg-surface-container-low">
          <CardContent className="pt-4">
            <p className="text-sm text-on-surface-variant mb-2">
              Akun Free dapat menambahkan maksimal{' '}
              <span className="font-semibold text-on-surface">{maxCount} {limitLabel}</span>{' '}
              per klinik.
            </p>
            <p className="text-sm text-on-surface-variant">
              Kamu sudah memiliki:{' '}
              <span className="font-semibold text-on-surface">{currentCount || 0}</span>{' '}
              / {maxCount === -1 ? '∞' : maxCount}
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-on-surface-variant">
            Upgrade ke Pro untuk {limitLabel} tanpa batas.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="medical"
            onClick={handleUpgrade}
            className="flex-1"
          >
            Upgrade ke Pro
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Kelola yang Ada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeModal;
