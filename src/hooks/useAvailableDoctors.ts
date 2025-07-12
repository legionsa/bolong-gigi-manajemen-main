
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDay } from 'date-fns';

const fetchAvailableDoctors = async (date: string) => {
  if (!date) return [];
  
  // getDay: Sunday is 0, Monday is 1, etc. Supabase needs 1 for Monday, 7 for Sunday.
  let dayOfWeek = getDay(new Date(date));
  if (dayOfWeek === 0) { // date-fns Sunday is 0, we want 7
      dayOfWeek = 7;
  }

  const { data: schedules, error: scheduleError } = await supabase
    .from('doctor_schedules')
    .select('doctor_id')
    .or(`date.eq.${date},day_of_week.eq.${dayOfWeek}`);

  if (scheduleError) {
    console.error("Error fetching schedules:", scheduleError);
    throw new Error(scheduleError.message);
  }

  if (!schedules || schedules.length === 0) {
    return [];
  }

  const doctorIds = [...new Set(schedules.map(s => s.doctor_id))].filter(id => id);

  if (doctorIds.length === 0) {
      return [];
  }

  const { data: doctors, error: doctorsError } = await supabase
    .from('users')
    .select('id, full_name')
    .in('id', doctorIds)
    .eq('role_name', 'Dentist');
    
  if (doctorsError) {
    console.error("Error fetching doctors:", doctorsError);
    throw new Error(doctorsError.message);
  }

  return doctors;
};

export const useAvailableDoctors = (date: string) => {
  return useQuery({
    queryKey: ["availableDoctors", date],
    queryFn: () => fetchAvailableDoctors(date),
    enabled: !!date,
  });
};
