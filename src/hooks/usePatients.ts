
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePatients = () => {
  const queryClient = useQueryClient();

  const fetchPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) throw new Error(error.message);
    return data;
  };

  const addPatient = async (newPatient) => {
    // Remove the auto-generation logic and use the patient number as provided
    const { data, error } = await supabase.from('patients').insert([newPatient]).select();
    if (error) throw new Error(error.message);
    return data[0];
  };

  const updatePatient = async ({ id, ...updateData }) => {
    const { data, error } = await supabase.from('patients').update(updateData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  };

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const addPatientMutation = useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: updatePatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return {
    patients: patientsQuery.data,
    isLoading: patientsQuery.isLoading,
    addPatient: addPatientMutation.mutateAsync,
    isAdding: addPatientMutation.isPending,
    updatePatient: updatePatientMutation.mutateAsync,
    isUpdating: updatePatientMutation.isPending,
  };
};
