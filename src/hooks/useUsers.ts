
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUsers = () => {
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').eq('role_name', 'Dentist');
    if (error) throw new Error(error.message);
    return data;
  };

  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};
