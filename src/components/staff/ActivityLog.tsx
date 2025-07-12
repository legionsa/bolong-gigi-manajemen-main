
import { useState, useEffect } from 'react'; // Added useEffect
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button'; // Added Button
import { Trash2 } from 'lucide-react'; // Added Trash2 icon
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { supabase } from '@/integrations/supabase/client'; // Added supabase
import { useToast } from '@/hooks/use-toast'; // Added useToast
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" // Added AlertDialog

// Assuming Json is defined in your Supabase types as string | number | boolean | null | { [key: string]: Json } | Json[]
// If not, you might need to define it or import it from 'database.types.ts' if it exists there.
// For simplicity, using 'any' here, but a more specific type is better.
interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: string;
  details?: any; // Changed from Record<string, any> to any to match Supabase Json type flexibility
  created_at: string;
  deleted_at?: string | null; // For soft delete
  users?: { full_name?: string; email?: string } | null; // User details from join
  target_entity?: string | null;
  target_id?: string | null;
}

export const ActivityLog = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // This might need to align with actual action types

  const isSuperAdmin = userProfile?.role_name === 'Super Admin';

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          user_id,
          action,
          details,
          created_at,
          deleted_at,
          target_entity,
          target_id,
          users (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({ title: 'Gagal Memuat Log', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleDeleteLog = async (logId: string) => {
    if (!isSuperAdmin) {
      toast({ title: 'Akses Ditolak', description: 'Hanya Super Admin yang dapat menghapus log.', variant: 'destructive' });
      return;
    }
    try {
      // Soft delete: update deleted_at timestamp
      const { error } = await supabase
        .from('activity_logs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', logId);
      if (error) throw error;
      toast({ title: 'Log Dihapus', description: 'Log aktivitas telah ditandai sebagai dihapus.' });
      fetchActivities(); // Refresh the list
    } catch (error) {
      console.error('Error deleting activity log:', error);
      toast({ title: 'Gagal Menghapus Log', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const getActionBadgeStyle = (actionString: string): string => {
    const actionLower = actionString.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('buat') || actionLower.includes('tambah')) {
      return 'bg-green-100 text-green-800';
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('ubah') || actionLower.includes('perbarui')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('hapus')) {
      return 'bg-red-100 text-red-800';
    }
    if (actionLower.includes('login') || actionLower.includes('logout')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (actionLower.includes('view') || actionLower.includes('read') || actionLower.includes('lihat')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-gray-100 text-gray-800'; // Default
  };

  const getActionDisplayLabel = (actionString: string): string => {
    // Attempt to extract a concise label, e.g., the first word or a keyword
    const words = actionString.split(' ');
    if (words.length > 0) {
      const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      // You could add more sophisticated logic here to map keywords to friendlier labels
      if (actionString.toLowerCase().includes('permission')) return 'Izin Akses';
      if (actionString.toLowerCase().includes('role')) return 'Peran';
      if (actionString.toLowerCase().includes('login')) return 'Login';
      if (actionString.toLowerCase().includes('logout')) return 'Logout';
      return firstWord; 
    }
    return 'Aksi'; // Default label
  };

  const filteredActivities = activities
    // .filter(activity => !activity.deleted_at) // Optionally hide deleted logs by default or add a toggle
    .filter(activity => {
      const searchTermLower = searchTerm.toLowerCase();
      const userIdentifier = activity.users?.full_name || activity.users?.email || activity.user_id;
      return (
        activity.action.toLowerCase().includes(searchTermLower) ||
        (userIdentifier && userIdentifier.toLowerCase().includes(searchTermLower)) ||
        (activity.details && JSON.stringify(activity.details).toLowerCase().includes(searchTermLower)) ||
        (activity.target_entity && activity.target_entity.toLowerCase().includes(searchTermLower))
      );
    })
    .filter(activity => filterType === 'all' || activity.action.toLowerCase().includes(filterType.toLowerCase())); // Adjust filter logic as needed

  if (isLoading) {
    return <div className="p-4">Memuat log aktivitas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Log Aktivitas</h2>
        {/* The visibility of this component should be controlled by parent based on Super Admin role */}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Cari log berdasarkan aksi, pengguna, detail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter tipe aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            {/* Dynamically populate filter options based on unique actions in logs or predefined types */}
            {[...new Set(activities.map(a => a.action.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()))].filter(Boolean).map(actionPrefix => (
              <SelectItem key={actionPrefix} value={actionPrefix}>{actionPrefix.charAt(0).toUpperCase() + actionPrefix.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredActivities.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Tidak ada log aktivitas yang cocok dengan filter Anda.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filteredActivities.map((activity) => (
          <Card key={activity.id} className={`transition-opacity ${activity.deleted_at ? 'opacity-60 border-dashed border-red-300' : 'border-gray-200'}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={activity.deleted_at ? "destructive" : "secondary"} className={`text-xs ${getActionBadgeStyle(activity.action)}`}>
                      {getActionDisplayLabel(activity.action)} {/* Or a more specific type field */}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-800">
                      {activity.users?.full_name || activity.users?.email || `User ID: ${activity.user_id}`}
                    </span>
                  </div>
                  <p className="text-base font-medium text-gray-900">{activity.action}</p>
                  {activity.target_entity && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Target: {activity.target_entity} {activity.target_id ? `(ID: ${activity.target_id})` : ''}
                    </p>
                  )}
                  {activity.details && (
                    <details className="mt-1.5 text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">Lihat Detail</summary>
                      <pre className="text-xs bg-gray-50 p-2.5 rounded mt-1 overflow-auto max-h-40 border border-gray-200">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="text-left sm:text-right flex flex-col items-start sm:items-end mt-2 sm:mt-0">
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(activity.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {isSuperAdmin && !activity.deleted_at && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        {/* Changed size from "xs" to "sm" as "xs" is not a valid size for Button */}
                        <Button variant="ghost" size="sm" className="mt-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 h-auto">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Log
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Anda yakin ingin menghapus log ini?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini akan menandai log sebagai terhapus (soft delete) dan tidak akan ditampilkan secara default.
                            Log akan tetap ada di database untuk keperluan audit.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteLog(activity.id)} className="bg-red-600 hover:bg-red-700">
                            Ya, Hapus Log
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {activity.deleted_at && (
                     <Badge variant="outline" className="mt-1.5 text-xs border-red-500 text-red-600 py-0.5 px-1.5">Dihapus pada {new Date(activity.deleted_at).toLocaleDateString('id-ID')}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
