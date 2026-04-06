'use client';

import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TrialBannerProps {
  trialDaysRemaining: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

const DISMISSAL_KEY = 'trial_banner_dismissed';

export function TrialBanner({ trialDaysRemaining, onUpgrade, onDismiss }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check localStorage for previous dismissal
    const wasDismissed = localStorage.getItem(DISMISSAL_KEY);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Don't show if trial is over or already dismissed
  if (trialDaysRemaining <= 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    // Save to localStorage
    localStorage.setItem(DISMISSAL_KEY, 'true');
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = '/pricing';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest border-b border-outline-variant/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-bold text-primary whitespace-nowrap">
              Pro Trial aktif
            </span>
            <span className="text-on-surface-variant">·</span>
          </div>
          <div className="hidden sm:block min-w-0">
            <span className="text-sm text-on-surface-variant">
              Sisa <span className="font-semibold text-on-surface">{trialDaysRemaining}</span> hari
            </span>
          </div>
          <div className="hidden md:block text-sm text-on-surface-variant">
            Nikmati semua fitur Pro. Upgrade sebelum trial berakhir.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="medical"
            size="sm"
            onClick={handleUpgrade}
            className="whitespace-nowrap"
          >
            Upgrade Sekarang
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrialBanner;
