
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServiceData {
  id?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  duration_minutes?: number;
  is_active?: boolean;
}

export const useServices = () => {
  const queryClient = useQueryClient();

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return data;
  };

  const addService = async (service: ServiceData) => {
    const { error } = await supabase.from("services").insert([service]);
    if (error) throw new Error(error.message);
    return service;
  };

  const updateService = async (service: ServiceData) => {
    const { error } = await supabase
      .from("services")
      .update(service)
      .eq("id", service.id);
    if (error) throw new Error(error.message);
    return service;
  };

  const deleteService = async (serviceId: string) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: false })
      .eq("id", serviceId);
    if (error) throw new Error(error.message);
    return serviceId;
  };

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });

  const addServiceMutation = useMutation({ 
    mutationFn: addService, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }) 
  });
  
  const updateServiceMutation = useMutation({ 
    mutationFn: updateService, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }) 
  });
  
  const deleteServiceMutation = useMutation({ 
    mutationFn: deleteService, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }) 
  });

  return {
    services,
    isLoading,
    addService: addServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    adding: addServiceMutation.isPending,
    updating: updateServiceMutation.isPending,
    deleting: deleteServiceMutation.isPending,
  };
};
