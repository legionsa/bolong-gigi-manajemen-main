
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StaffData {
  id?: string;
  full_name: string;
  email: string;
  phone_number: string;
  role_name: string;
  role_id?: string;
}

interface StaffUpdateData {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  role_name?: string;
  role_id?: string;
}

export const useStaff = () => {
  const queryClient = useQueryClient();

  const fetchStaff = async () => {
    const { data, error } = await supabase.from("users").select("*");
    if (error) throw new Error(error.message);
    return data;
  };

  const addStaff = async (staff: StaffData) => {
    const { error } = await supabase.from("users").insert([{
      ...staff,
      role_id: staff.role_name.toLowerCase().replace(' ', '_')
    }]);
    if (error) throw new Error(error.message);
    return staff;
  };

  const updateStaff = async (staff: StaffUpdateData) => {
    const updateData: any = {};
    
    if (staff.full_name) updateData.full_name = staff.full_name;
    if (staff.email) updateData.email = staff.email;
    if (staff.phone_number) updateData.phone_number = staff.phone_number;
    if (staff.role_name) {
      updateData.role_name = staff.role_name;
      updateData.role_id = staff.role_name.toLowerCase().replace(' ', '_');
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", staff.id);
    if (error) throw new Error(error.message);
    return staff;
  };

  const deleteStaff = async (staffId: string) => {
    const { error } = await supabase.from("users").delete().eq("id", staffId);
    if (error) throw new Error(error.message);
    return staffId;
  };

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: fetchStaff,
  });

  const addStaffMutation = useMutation({ 
    mutationFn: addStaff, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }) 
  });
  
  const updateStaffMutation = useMutation({ 
    mutationFn: updateStaff, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }) 
  });
  
  const deleteStaffMutation = useMutation({ 
    mutationFn: deleteStaff, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }) 
  });

  return {
    staff,
    isLoading,
    addStaff: addStaffMutation.mutateAsync,
    adding: addStaffMutation.isPending,
    updating: updateStaffMutation.isPending,
    updateStaff: updateStaffMutation.mutateAsync,
    deleteStaff: deleteStaffMutation.mutateAsync,
    deleting: deleteStaffMutation.isPending,
  };
};
