import { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePermissions, Permission } from '@/hooks/usePermissions';
import { UpgradeModal, UpgradeModalProps } from './UpgradeModal';

export interface PermissionGateProps {
  permission?: Permission;
  tierFeature?: string;
  limitKey?: string;
  currentCount?: number;
  fallback?: 'hide' | 'lock' | 'disable';
  upgradeReason?: string;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  tierFeature,
  limitKey,
  currentCount = 0,
  fallback = 'lock',
  upgradeReason,
  children,
}: PermissionGateProps) {
  const { can, tierCan, isWithinLimit } = usePermissions();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Check permission-based access
  if (permission !== undefined && !can(permission)) {
    if (fallback === 'hide') {
      return null;
    }
    // For 'lock' or 'disable' fallback, show the children but with overlay
    return (
      <div className="relative">
        <div className={fallback === 'disable' ? 'pointer-events-none opacity-50' : 'opacity-40 pointer-events-none'}>
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
          >
            <Lock className="w-3 h-3" />
            Pro
          </button>
        </div>
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          type="feature_lock"
          featureName={upgradeReason || 'Fitur ini'}
          featureBenefits={
            upgradeReason
              ? [`Akses ${upgradeReason} memerlukan paket Pro`]
              : undefined
          }
        />
      </div>
    );
  }

  // Check tier feature access
  if (tierFeature !== undefined && !tierCan(tierFeature)) {
    const isLocked = fallback === 'lock' || fallback === 'disable';
    return (
      <div className="relative">
        <div className={isLocked ? 'opacity-40 pointer-events-none' : ''}>
          {children}
        </div>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
            >
              <Lock className="w-3 h-3" />
              Pro
            </button>
          </div>
        )}
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          type="feature_lock"
          featureName={upgradeReason || tierFeature.replace('can_', '').replace(/_/g, ' ')}
          featureBenefits={
            upgradeReason
              ? undefined
              : [
                  `Akses ${tierFeature.replace('can_', '').replace(/_/g, ' ')} memerlukan paket Pro`,
                ]
          }
        />
      </div>
    );
  }

  // Check limit-based access
  if (limitKey !== undefined && !isWithinLimit(limitKey, currentCount)) {
    const isLocked = fallback === 'lock' || fallback === 'disable';
    return (
      <div className="relative">
        <div className={isLocked ? 'opacity-40 pointer-events-none' : ''}>
          {children}
        </div>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
            >
              <Lock className="w-3 h-3" />
              Pro
            </button>
          </div>
        )}
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          type="limit_reached"
          limitKey={limitKey}
          currentCount={currentCount}
        />
      </div>
    );
  }

  // All checks passed, render children normally
  return <>{children}</>;
}

export default PermissionGate;
