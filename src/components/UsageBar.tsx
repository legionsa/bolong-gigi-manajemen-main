import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from './UpgradeModal';

export interface UsageBarProps {
  label: string;
  used: number;
  max: number;
  icon?: string;
  unit?: string;
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

// Map label to limitKey for upgrade modal
const LABEL_TO_LIMIT_KEY: Record<string, string> = {
  'klinik': 'max_clinics',
  'dokter': 'max_doctors_per_clinic',
  'resepsionis': 'max_front_desk_per_clinic',
  'staf finance': 'max_finance_per_clinic',
  'admin': 'max_admins_per_clinic',
  'penyimpanan': 'max_storage_gb',
  'template surat izin': 'max_surat_izin_templates',
};

export function UsageBar({ label, used, max, icon, unit }: UsageBarProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Determine color based on usage percentage
  const getBarColor = (): string => {
    if (max === -1) return 'bg-success';
    const percentage = (used / max) * 100;
    if (percentage < 70) return 'bg-success';
    if (percentage < 90) return 'bg-warning';
    return 'bg-error';
  };

  // Calculate fill percentage
  const getFillWidth = (): string => {
    if (max === -1) return '100%';
    const percentage = Math.min((used / max) * 100, 100);
    return `${percentage}%`;
  };

  // Determine text color
  const getTextColor = (): string => {
    if (max === -1) return 'text-success';
    const percentage = (used / max) * 100;
    if (percentage < 70) return 'text-success';
    if (percentage < 90) return 'text-warning';
    return 'text-error';
  };

  // Show upgrade modal if at or over limit
  const showUpgradeButton = max !== -1 && used >= max;
  const limitKey = LABEL_TO_LIMIT_KEY[label.toLowerCase()];

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        {icon && (
          <span className="text-lg" role="img" aria-label={label}>
            {icon}
          </span>
        )}
        <span className="text-sm font-medium text-on-surface min-w-[100px]">
          {label}
        </span>
        <div className="flex-1 bg-surface-container-low rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: getFillWidth() }}
          />
        </div>
        <span className={`text-xs font-semibold min-w-[80px] text-right ${getTextColor()}`}>
          {max === -1 ? (
            <span className="text-success">∞ Unlimited</span>
          ) : (
            `${used} / ${max}${unit ? ` ${unit}` : ''}`
          )}
        </span>
        {showUpgradeButton && limitKey && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-error hover:text-error hover:bg-error/10"
            onClick={() => setUpgradeModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {limitKey && (
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          type="limit_reached"
          limitKey={limitKey}
          currentCount={used}
          maxCount={max}
        />
      )}
    </>
  );
}

export default UsageBar;
