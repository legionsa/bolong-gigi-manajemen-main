import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Branch {
  id: string;
  clinic_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorBranch {
  id: string;
  doctor_id: string;
  branch_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface BranchServicePricing {
  id: string;
  branch_id: string;
  service_id: string;
  price: number;
  effective_from: string;
  created_at: string;
}

export const useBranches = (clinicId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all branches for the current clinic
  const fetchBranches = async (): Promise<Branch[]> => {
    if (!clinicId) return [];

    const { data, error } = await supabase
      .from("branches")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("is_main", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching branches:", error);
      throw new Error(error.message);
    }
    return data || [];
  };

  // Create a new branch
  const createBranch = async (branch: Partial<Branch>): Promise<Branch> => {
    if (!clinicId) throw new Error("Clinic ID is required");

    // If this is set as main, unset other main branches first
    if (branch.is_main) {
      await supabase
        .from("branches")
        .update({ is_main: false })
        .eq("clinic_id", clinicId)
        .eq("is_main", true);
    }

    const { data, error } = await supabase
      .from("branches")
      .insert({ ...branch, clinic_id: clinicId })
      .select()
      .single();

    if (error) {
      console.error("Error creating branch:", error);
      throw new Error(error.message);
    }
    return data;
  };

  // Update an existing branch
  const updateBranch = async (branch: Partial<Branch> & { id: string }): Promise<Branch> => {
    const { id, ...updates } = branch;

    // If setting as main, unset other main branches first
    if (updates.is_main) {
      const currentBranch = await supabase
        .from("branches")
        .select("clinic_id")
        .eq("id", id)
        .single();

      if (currentBranch.data) {
        await supabase
          .from("branches")
          .update({ is_main: false })
          .eq("clinic_id", currentBranch.data.clinic_id)
          .eq("is_main", true)
          .neq("id", id);
      }
    }

    const { data, error } = await supabase
      .from("branches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating branch:", error);
      throw new Error(error.message);
    }
    return data;
  };

  // Soft delete a branch (set is_active to false)
  const deleteBranch = async (branchId: string): Promise<void> => {
    const { error } = await supabase
      .from("branches")
      .update({ is_active: false, is_main: false })
      .eq("id", branchId);

    if (error) {
      console.error("Error deleting branch:", error);
      throw new Error(error.message);
    }
  };

  // Set a branch as the main branch
  const setMainBranch = async (branchId: string): Promise<void> => {
    // First get the clinic_id for this branch
    const { data: branch, error: fetchError } = await supabase
      .from("branches")
      .select("clinic_id")
      .eq("id", branchId)
      .single();

    if (fetchError || !branch) {
      throw new Error("Branch not found");
    }

    // Unset main flag from all other branches
    await supabase
      .from("branches")
      .update({ is_main: false })
      .eq("clinic_id", branch.clinic_id)
      .eq("is_main", true);

    // Set this branch as main
    const { error } = await supabase
      .from("branches")
      .update({ is_main: true })
      .eq("id", branchId);

    if (error) {
      console.error("Error setting main branch:", error);
      throw new Error(error.message);
    }
  };

  // Link a doctor to a branch
  const linkDoctorToBranch = async (doctorId: string, branchId: string, isPrimary = false): Promise<DoctorBranch> => {
    const { data, error } = await supabase
      .from("doctor_branches")
      .insert({
        doctor_id: doctorId,
        branch_id: branchId,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      console.error("Error linking doctor to branch:", error);
      throw new Error(error.message);
    }
    return data;
  };

  // Unlink a doctor from a branch
  const unlinkDoctorFromBranch = async (doctorId: string, branchId: string): Promise<void> => {
    const { error } = await supabase
      .from("doctor_branches")
      .delete()
      .eq("doctor_id", doctorId)
      .eq("branch_id", branchId);

    if (error) {
      console.error("Error unlinking doctor from branch:", error);
      throw new Error(error.message);
    }
  };

  // Update doctor-branch association (set as primary)
  const updateDoctorBranch = async (id: string, updates: { is_primary?: boolean }): Promise<DoctorBranch> => {
    const { data, error } = await supabase
      .from("doctor_branches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating doctor branch:", error);
      throw new Error(error.message);
    }
    return data;
  };

  // Fetch branches for a specific doctor
  const fetchDoctorBranches = async (doctorId: string): Promise<(DoctorBranch & { branch: Branch })[]> => {
    const { data, error } = await supabase
      .from("doctor_branches")
      .select(`
        *,
        branch:branches(*)
      `)
      .eq("doctor_id", doctorId);

    if (error) {
      console.error("Error fetching doctor branches:", error);
      throw new Error(error.message);
    }
    return data || [];
  };

  // Fetch all doctors for a specific branch
  const fetchBranchDoctors = async (branchId: string): Promise<(DoctorBranch & { doctor: any })[]> => {
    const { data, error } = await supabase
      .from("doctor_branches")
      .select(`
        *,
        doctor:users(*)
      `)
      .eq("branch_id", branchId);

    if (error) {
      console.error("Error fetching branch doctors:", error);
      throw new Error(error.message);
    }
    return data || [];
  };

  // Query for branches
  const branchesQuery = useQuery({
    queryKey: ["branches", clinicId],
    queryFn: fetchBranches,
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  // Create mutation
  const createBranchMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", clinicId] });
    },
  });

  // Update mutation
  const updateBranchMutation = useMutation({
    mutationFn: updateBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", clinicId] });
    },
  });

  // Delete mutation
  const deleteBranchMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", clinicId] });
    },
  });

  // Set main branch mutation
  const setMainBranchMutation = useMutation({
    mutationFn: setMainBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches", clinicId] });
    },
  });

  // Link doctor mutation
  const linkDoctorMutation = useMutation({
    mutationFn: ({ doctorId, branchId, isPrimary }: { doctorId: string; branchId: string; isPrimary?: boolean }) =>
      linkDoctorToBranch(doctorId, branchId, isPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor_branches"] });
    },
  });

  // Unlink doctor mutation
  const unlinkDoctorMutation = useMutation({
    mutationFn: ({ doctorId, branchId }: { doctorId: string; branchId: string }) =>
      unlinkDoctorFromBranch(doctorId, branchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor_branches"] });
    },
  });

  // Update doctor branch mutation
  const updateDoctorBranchMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { is_primary?: boolean } }) =>
      updateDoctorBranch(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor_branches"] });
    },
  });

  return {
    branches: branchesQuery.data || [],
    isLoading: branchesQuery.isLoading && !branchesQuery.data,
    isFetching: branchesQuery.isFetching,

    createBranch: createBranchMutation.mutateAsync,
    isCreating: createBranchMutation.isPending,

    updateBranch: updateBranchMutation.mutateAsync,
    isUpdating: updateBranchMutation.isPending,

    deleteBranch: deleteBranchMutation.mutateAsync,
    isDeleting: deleteBranchMutation.isPending,

    setMainBranch: setMainBranchMutation.mutateAsync,
    isSettingMain: setMainBranchMutation.isPending,

    linkDoctorToBranch: linkDoctorMutation.mutateAsync,
    isLinkingDoctor: linkDoctorMutation.isPending,

    unlinkDoctorFromBranch: unlinkDoctorMutation.mutateAsync,
    isUnlinkingDoctor: unlinkDoctorMutation.isPending,

    updateDoctorBranch: updateDoctorBranchMutation.mutateAsync,
    isUpdatingDoctorBranch: updateDoctorBranchMutation.isPending,

    fetchDoctorBranches,
    fetchBranchDoctors,

    refetch: branchesQuery.refetch,
  };
};

// Hook to get branches for a specific doctor
export const useDoctorBranches = (doctorId: string | undefined) => {
  const queryClient = useQueryClient();

  const fetchDoctorBranches = async (): Promise<(DoctorBranch & { branch: Branch })[]> => {
    if (!doctorId) return [];

    const { data, error } = await supabase
      .from("doctor_branches")
      .select(`
        *,
        branch:branches(*)
      `)
      .eq("doctor_id", doctorId);

    if (error) {
      console.error("Error fetching doctor branches:", error);
      throw new Error(error.message);
    }
    return data || [];
  };

  const query = useQuery({
    queryKey: ["doctor_branches", doctorId],
    queryFn: fetchDoctorBranches,
    enabled: !!doctorId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    doctorBranches: query.data || [],
    isLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};

// Hook to get doctors for a specific branch
export const useBranchDoctors = (branchId: string | undefined) => {
  const fetchBranchDoctors = async (): Promise<(DoctorBranch & { doctor: any })[]> => {
    if (!branchId) return [];

    const { data, error } = await supabase
      .from("doctor_branches")
      .select(`
        *,
        doctor:users(*)
      `)
      .eq("branch_id", branchId);

    if (error) {
      console.error("Error fetching branch doctors:", error);
      throw new Error(error.message);
    }
    return data || [];
  };

  const query = useQuery({
    queryKey: ["branch_doctors", branchId],
    queryFn: fetchBranchDoctors,
    enabled: !!branchId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    branchDoctors: query.data || [],
    isLoading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
};
