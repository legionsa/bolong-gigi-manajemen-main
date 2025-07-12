
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDoctorSchedules = (doctorId) => {
  const queryClient = useQueryClient();

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  };

  // Create / update / delete
  const addSchedule = async (schedule) => {
    const { data, error } = await supabase.from("doctor_schedules").insert([schedule]).select();
    if (error) throw new Error(error.message);
    return data?.[0];
  };
  
  const updateSchedule = async (schedule) => {
    const { data, error } = await supabase
      .from("doctor_schedules")
      .update(schedule)
      .eq("id", schedule.id)
      .select();
    if (error) throw new Error(error.message);
    return data?.[0];
  };
  
  const deleteSchedule = async (id) => {
    const { error } = await supabase.from("doctor_schedules").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  };

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["doctorSchedules", doctorId],
    queryFn: fetchSchedules,
    enabled: !!doctorId,
  });

  const addMutation = useMutation({
    mutationFn: addSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctorSchedules", doctorId] }),
  });
  
  const updateMutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctorSchedules", doctorId] }),
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctorSchedules", doctorId] }),
  });

  return {
    schedules,
    isLoading,
    addSchedule: addMutation.mutateAsync,
    updateSchedule: updateMutation.mutateAsync,
    updateLoading: updateMutation.isPending,
    deleteSchedule: deleteMutation.mutateAsync,
    deleteLoading: deleteMutation.isPending,
  };
};
