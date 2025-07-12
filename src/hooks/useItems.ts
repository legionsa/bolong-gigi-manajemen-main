
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ItemData {
  id?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  unit?: string;
  stock_quantity?: number;
  is_active?: boolean;
}

export const useItems = () => {
  const queryClient = useQueryClient();

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return data;
  };

  const addItem = async (item: ItemData) => {
    const { error } = await supabase.from("items").insert([item]);
    if (error) throw new Error(error.message);
    return item;
  };

  const updateItem = async (item: ItemData) => {
    const { error } = await supabase
      .from("items")
      .update(item)
      .eq("id", item.id);
    if (error) throw new Error(error.message);
    return item;
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("items")
      .update({ is_active: false })
      .eq("id", itemId);
    if (error) throw new Error(error.message);
    return itemId;
  };

  const { data: items, isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: fetchItems,
  });

  const addItemMutation = useMutation({ 
    mutationFn: addItem, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }) 
  });
  
  const updateItemMutation = useMutation({ 
    mutationFn: updateItem, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }) 
  });
  
  const deleteItemMutation = useMutation({ 
    mutationFn: deleteItem, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }) 
  });

  return {
    items,
    isLoading,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    adding: addItemMutation.isPending,
    updating: updateItemMutation.isPending,
    deleting: deleteItemMutation.isPending,
  };
};
