import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TierLimits {
  max_clinics: number;
  max_doctors_per_clinic: number;
  max_front_desk_per_clinic: number;
  max_finance_per_clinic: number;
  max_admins_per_clinic: number;
  max_storage_gb: number;
  analytics_days: number;
  can_export: boolean;
  can_whatsapp: boolean;
  can_bpjs: boolean;
  can_ai_notes: boolean;
  can_patient_portal: boolean;
  max_surat_izin_templates: number;
  can_custom_subdomain: boolean;
}

export function useAccountTier() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('pro_trial');
  const [effectiveTier, setEffectiveTier] = useState<string>('pro_trial');
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(14);
  const [tierExpiresAt, setTierExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    const fetchTier = async () => {
      const { data } = await supabase
        .from('account_active_tier')
        .select('*')
        .eq('owner_user_id', user.id)
        .single();

      if (data) {
        setAccountId(data.id);
        setTier(data.tier);
        setEffectiveTier(data.effective_tier);
        setTierExpiresAt(data.tier_expires_at || null);
        setLimits({
          max_clinics: data.max_clinics,
          max_doctors_per_clinic: data.max_doctors_per_clinic,
          max_front_desk_per_clinic: data.max_front_desk_per_clinic,
          max_finance_per_clinic: data.max_finance_per_clinic,
          max_admins_per_clinic: data.max_admins_per_clinic,
          max_storage_gb: data.max_storage_gb,
          analytics_days: data.analytics_days,
          can_export: data.can_export,
          can_whatsapp: data.can_whatsapp,
          can_bpjs: data.can_bpjs,
          can_ai_notes: data.can_ai_notes,
          can_patient_portal: data.can_patient_portal,
          max_surat_izin_templates: data.max_surat_izin_templates,
          can_custom_subdomain: data.can_custom_subdomain,
        });
        if (data.trial_ends_at) {
          const days = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          setTrialDaysRemaining(Math.max(0, days));
        }
      }
      setIsLoading(false);
    };
    fetchTier();
  }, [user]);

  const isTrial = tier === 'pro_trial';
  const isPro = effectiveTier === 'pro' || effectiveTier === 'enterprise';
  const isFree = effectiveTier === 'free';
  const tierLabel = tier === 'pro_trial' ? `Pro Trial (${trialDaysRemaining} hari)` : effectiveTier.charAt(0).toUpperCase() + effectiveTier.slice(1);

  return { accountId, tier, effectiveTier, limits, trialDaysRemaining, tierExpiresAt, isTrial, isPro, isFree, tierLabel, isLoading };
}
