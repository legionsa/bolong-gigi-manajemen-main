import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useClinicUser(_clinicId?: string | null) {
  const { user } = useAuth();
  const [clinicUser, setClinicUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clinicError, setClinicError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    const fetch = async () => {
      setIsLoading(true);

      const { data: cuData, error: cuError } = await supabase
        .from('clinic_users')
        .select('clinic_id, role, status')
        .eq('user_id', user.id)
        .maybeSingle();

      setClinicError(cuError?.message || null);

      if (!cuData?.clinic_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('clinic_users')
        .select('*, account:accounts(*)')
        .eq('user_id', user.id)
        .eq('clinic_id', cuData.clinic_id)
        .single();

      setClinicError(error?.message || null);
      setClinicUser(data);
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  return { clinicUser, role: clinicUser?.role, status: clinicUser?.status, permissionsOverride: clinicUser?.permissions_override || {}, isLoading, clinicError };
}
