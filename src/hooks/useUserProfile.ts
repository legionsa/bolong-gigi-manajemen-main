
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_auth_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error);
      throw new Error(error.message);
    }
    return data;
  };

  const { data: userProfile, isLoading: isLoadingProfile, refetch: refetchUserProfileQuery } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: fetchUserProfile,
    enabled: !!user,
  });

  const updateUserProfile = async (updates: { full_name?: string; avatar_url?: string; phone_number?: string }) => {
    if (!user) throw new Error("User not authenticated");

    if (userProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userProfile.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user profile:", error);
        throw new Error(error.message);
      }
      return data;
    } else {
      // Create new profile
      if (!user.email) throw new Error("User email is not available for profile creation.");
      
      // Create new profile or link existing email to this auth user
      const upsertPayload = {
        user_auth_id: user.id,
        email: user.email, // This will be the conflict target
        full_name: updates.full_name || (user.email ? user.email.split('@')[0] : 'Unnamed User'),
        avatar_url: updates.avatar_url,
        phone_number: updates.phone_number,
      };

      const { data, error } = await supabase
        .from("users")
        .upsert(upsertPayload, {
          onConflict: 'email', // Assumes 'email' has a unique constraint
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error upserting user profile:", error);
        throw new Error(error.message);
      }
      return data;
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
    },
  });

  const refetchUserProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
    // Optionally, you can also directly call the refetch function from useQuery if needed for immediate data update
    // refetchUserProfileQuery(); 
  };

  return {
    userProfile,
    isLoadingProfile,
    updateUserProfile: updateUserMutation.mutateAsync,
    isUpdatingProfile: updateUserMutation.isPending,
    refetchUserProfile, // Expose the refetch function
  };
};
