import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinicUser } from './useClinicUser';

export const useNotaKwitansi = () => {
  const queryClient = useQueryClient();
  const { clinicUser } = useClinicUser();
  const clinicId = clinicUser?.clinic_id;

  const fetchNotas = async () => {
    if (!clinicId) return [];
    const { data, error } = await supabase
      .from('nota_kwitansi')
      .select(`
        *,
        patients:patient_id(full_name, nik, address),
        appointments:appointment_id(appointment_date_time, service_name)
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  };

  const notasQuery = useQuery({
    queryKey: ['nota-kwitansi', clinicId],
    queryFn: fetchNotas,
    enabled: !!clinicId,
  });

  const createNota = async (notaData: {
    appointment_id?: string;
    patient_id: string;
    invoice_id?: string;
    invoice_number?: string;
    amount_total: number;
    amount_discount?: number;
    amount_final: number;
    payment_method: string;
    notes?: string;
  }) => {
    const { data, error } = await supabase
      .from('nota_kwitansi')
      .insert({ clinic_id: clinicId, ...notaData })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const updateNota = async ({ id, updates }: { id: string; updates: any }) => {
    const { data, error } = await supabase
      .from('nota_kwitansi')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const deleteNota = async (id: string) => {
    const { error } = await supabase.from('nota_kwitansi').delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const createMutation = useMutation({ mutationFn: createNota, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nota-kwitansi'] }) });
  const updateMutation = useMutation({ mutationFn: updateNota, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nota-kwitansi'] }) });
  const deleteMutation = useMutation({ mutationFn: deleteNota, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nota-kwitansi'] }) });

  return {
    notas: notasQuery.data,
    isLoading: notasQuery.isLoading,
    createNota: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateNota: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteNota: deleteMutation.mutateAsync,
  };
};
