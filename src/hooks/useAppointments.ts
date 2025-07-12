
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAppointments = () => {
  const queryClient = useQueryClient();

  const fetchAppointments = async () => {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) throw new Error(error.message);
    return data;
  };

  const addAppointment = async (newAppointment) => {
    const { patient_id, dentist_id, appointment_date, appointment_time, service_name, notes } = newAppointment;

    // Fetch patient and dentist names
    const { data: patientData } = await supabase.from('patients').select('full_name').eq('id', patient_id).single();
    const { data: dentistData } = await supabase.from('users').select('full_name').eq('id', dentist_id).single();

    const appointmentToInsert = {
        patient_id,
        dentist_id,
        appointment_date_time: `${appointment_date}T${appointment_time}:00`,
        service_name,
        notes,
        patient_name: patientData?.full_name || 'N/A',
        dentist_name: dentistData?.full_name || 'N/A',
        service_id: service_name.toLowerCase().replace(' ', '-'), // simple service id
        status: 'Dijadwalkan',
        duration_in_minutes: 30,
    };

    const { data, error } = await supabase.from('appointments').insert([appointmentToInsert]).select();
    if (error) throw new Error(error.message);
    return data[0];
  };

  const updateAppointment = async ({ id, ...updates }: { id: string; [key: string]: any }) => {
    let appointmentToUpdate = { ...updates };

    if (updates.appointment_date && updates.appointment_time) {
      appointmentToUpdate.appointment_date_time = `${updates.appointment_date}T${updates.appointment_time}:00`;
      delete appointmentToUpdate.appointment_date;
      delete appointmentToUpdate.appointment_time;
    }

    // Check if patient_id is being updated and fetch new name
    if (updates.patient_id) {
        const { data: patientData, error: patientError } = await supabase.from('patients').select('full_name').eq('id', updates.patient_id).maybeSingle();
        if (patientError) console.error("Error fetching patient name:", patientError);
        appointmentToUpdate.patient_name = patientData?.full_name || 'N/A';
    }

    // Check if dentist_id is being updated and fetch new name
    if (updates.dentist_id) {
        const { data: dentistData, error: dentistError } = await supabase.from('users').select('full_name').eq('id', updates.dentist_id).maybeSingle();
        if (dentistError) console.error("Error fetching dentist name:", dentistError);
        appointmentToUpdate.dentist_name = dentistData?.full_name || 'N/A';
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .update(appointmentToUpdate)
      .eq('id', id)
      .select();

    if (error) {
      console.error("Error updating appointment:", error);
      throw new Error(error.message);
    }
    return data?.[0];
  };

  const appointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: fetchAppointments,
  });

  const addAppointmentMutation = useMutation({
    mutationFn: addAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    appointments: appointmentsQuery.data,
    isLoading: appointmentsQuery.isLoading,
    addAppointment: addAppointmentMutation.mutateAsync,
    isAdding: addAppointmentMutation.isPending,
    updateAppointment: updateAppointmentMutation.mutateAsync,
    isUpdating: updateAppointmentMutation.isPending,
  };
};
