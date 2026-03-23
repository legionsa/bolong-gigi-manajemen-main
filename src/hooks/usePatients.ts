
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
    console.log('Adding patient:', newPatient);

    const result = await supabase.from('patients').insert([newPatient]).select();
    console.log('Add patient result:', result);

    const { data, error } = result;
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
    retry: false,
    staleTime: 1000 * 60 * 30, // Data stays fresh for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    placeholderData: (previousData) => previousData, // Show old data during refetch
  });

  const addPatientMutation = useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      } catch (e) {
        console.error('InvalidateQueries error:', e);
      }
    },
    onError: (error) => {
      console.error('Add patient error:', error);
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: updatePatient,
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      } catch (e) {
        console.error('InvalidateQueries error:', e);
      }
    },
  });

  return {
    patients: patientsQuery.data,
    // Use isFetching instead of isLoading to show data immediately from cache
    isLoading: patientsQuery.isLoading && !patientsQuery.data,
    isRefreshing: patientsQuery.isFetching && !!patientsQuery.data,
    error: patientsQuery.error,
    addPatient: addPatientMutation.mutateAsync,
    isAdding: addPatientMutation.isPending,
    addError: addPatientMutation.error,
    updatePatient: updatePatientMutation.mutateAsync,
    isUpdating: updatePatientMutation.isPending,
  };
};
