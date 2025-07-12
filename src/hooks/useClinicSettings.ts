
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useClinicSettings = () => {
  const queryClient = useQueryClient();

  const fetchClinicSettings = async () => {
    const { data, error } = await supabase.from('clinic_settings').select('*').limit(1);
    if (error) throw new Error(error.message);
    return data[0];
  };

  const updateSettings = async (settings) => {
    const { id, ...updateData } = settings;
    const { data, error } = await supabase.from('clinic_settings').update(updateData).eq('id', id).select();
    if (error) throw new Error(error.message);
    return data[0];
  };

  const settingsQuery = useQuery({
    queryKey: ['clinicSettings'],
    queryFn: fetchClinicSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['clinicSettings'], data);
      queryClient.invalidateQueries({ queryKey: ['clinicSettings'] });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
};
