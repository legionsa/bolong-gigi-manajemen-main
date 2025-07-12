
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMedicalRecords = (patientId) => {
  const queryClient = useQueryClient();

  const fetchMedicalRecords = async () => {
    if (!patientId) return null;
    
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, doctor:users!doctor_id(id, full_name)')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false });

    if (error) {
      console.error("Error fetching medical records with doctor info:", error);
      throw new Error(error.message);
    }
    return data;
  };

  const addMedicalRecord = async (newRecord) => {
    const { data, error } = await supabase.from('medical_records').insert([newRecord]).select();
    if (error) throw new Error(error.message);
    return data[0];
  };

  const query = useQuery({
    queryKey: ['medicalRecords', patientId],
    queryFn: fetchMedicalRecords,
    enabled: !!patientId,
  });

  const addMutation = useMutation({
    mutationFn: addMedicalRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalRecords', patientId] });
    },
  });

  return {
    ...query,
    addMedicalRecord: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
};
