
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDoctors = () => {
  const queryClient = useQueryClient();

  const fetchDoctors = async () => {
    const { data, error } = await supabase.from("users").select("*").eq("role_name", "Dentist");
    if (error) throw new Error(error.message);
    return data;
  };

  // create/update/delete for live mode
  const addDoctor = async (doctor) => {
    const { error } = await supabase.from("users").insert([doctor]);
    if (error) throw new Error(error.message);
    return doctor;
  };

  const updateDoctor = async (doctor) => {
    const { error } = await supabase
      .from("users")
      .update(doctor)
      .eq("id", doctor.id);
    if (error) throw new Error(error.message);
    return doctor;
  };

  const deleteDoctor = async (doctorId) => {
    const { error } = await supabase.from("users").delete().eq("id", doctorId);
    if (error) throw new Error(error.message);
    return doctorId;
  };

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: fetchDoctors,
  });

  const addDoctorMutation = useMutation({ 
    mutationFn: addDoctor, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }) 
  });
  
  const updateDoctorMutation = useMutation({ 
    mutationFn: updateDoctor, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }) 
  });
  
  const deleteDoctorMutation = useMutation({ 
    mutationFn: deleteDoctor, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctors"] }) 
  });

  return {
    doctors,
    isLoading,
    addDoctor: addDoctorMutation.mutateAsync,
    adding: addDoctorMutation.isPending,
    updating: updateDoctorMutation.isPending,
    updateDoctor: updateDoctorMutation.mutateAsync,
    deleteDoctor: deleteDoctorMutation.mutateAsync,
    deleting: deleteDoctorMutation.isPending,
  };
};
