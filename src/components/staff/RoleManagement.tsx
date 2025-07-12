
import { useState, useEffect } from 'react'; // Added useState and useEffect
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button'; // Added Button
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { useToast } from '@/hooks/use-toast'; // Added useToast
import { supabase } from '@/integrations/supabase/client'; // Added supabase for potential direct DB interaction or function call

const roles = [
  {
    name: 'Super Admin',
    description: 'Akses penuh ke semua fitur sistem',
    permissions: ['manage_staff', 'manage_settings', 'view_billing', 'manage_patients', 'manage_doctors', 'view_reports'],
    color: 'bg-red-100 text-red-800'
  },
  {
    name: 'Admin',
    description: 'Mengelola operasi klinik harian',
    permissions: ['view_billing', 'manage_patients', 'manage_doctors', 'view_reports'],
    color: 'bg-blue-100 text-blue-800'
  },
  {
    name: 'Receptionist',
    description: 'Mengelola jadwal dan pasien',
    permissions: ['manage_patients', 'manage_appointments'],
    color: 'bg-green-100 text-green-800'
  },
  {
    name: 'Dentist',
    description: 'Menangani perawatan pasien',
    permissions: ['view_patients', 'manage_medical_records', 'view_appointments'],
    color: 'bg-purple-100 text-purple-800'
  },
  {
    name: 'Assistant',
    description: 'Membantu operasi klinik',
    permissions: ['view_patients', 'view_appointments'],
    color: 'bg-yellow-100 text-yellow-800'
  }
];

const permissionLabels = {
  manage_staff: 'Kelola Staff',
  manage_settings: 'Kelola Pengaturan',
  view_billing: 'Lihat Tagihan',
  manage_patients: 'Kelola Pasien',
  manage_doctors: 'Kelola Dokter',
  view_reports: 'Lihat Laporan',
  manage_appointments: 'Kelola Jadwal',
  view_patients: 'Lihat Pasien',
  manage_medical_records: 'Kelola Rekam Medis',
  view_appointments: 'Lihat Jadwal'
};

export const RoleManagement = () => {
  const { user, userProfile } = useAuth(); // Get user and profile
  const { toast } = useToast(); // For notifications
  const [currentRoles, setCurrentRoles] = useState(roles); // Manage roles state
  const [changedPermissions, setChangedPermissions] = useState<Record<string, string[]>>({});

  const isSuperAdmin = userProfile?.role_name === 'Super Admin';

  // Function to handle permission change
  const handlePermissionChange = (roleName: string, permission: string, checked: boolean) => {
    setCurrentRoles(prevRoles => 
      prevRoles.map(role => {
        if (role.name === roleName) {
          const newPermissions = checked 
            ? [...role.permissions, permission]
            : role.permissions.filter(p => p !== permission);
          return { ...role, permissions: newPermissions };
        }
        return role;
      })
    );
    setChangedPermissions(prev => ({
      ...prev,
      [roleName]: currentRoles.find(r => r.name === roleName)?.permissions || [] 
    }));
  };

  // Function to handle submitting permission changes
  const handleSubmitChanges = async (roleName: string) => {
    if (!isSuperAdmin) {
      toast({ title: 'Akses Ditolak', description: 'Hanya Super Admin yang dapat mengubah izin.', variant: 'destructive' });
      return;
    }

    const roleToUpdate = currentRoles.find(role => role.name === roleName);
    if (!roleToUpdate) return;

    // In a real app, you would send this to your backend/Supabase
    console.log(`Updating permissions for ${roleName}:`, roleToUpdate.permissions);
    // Example: await supabase.from('roles').update({ permissions: roleToUpdate.permissions }).eq('name', roleName);
    // For now, just a toast message

    // Log activity
    if (user?.id) {
      const { error: logError } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: `Updated permissions for role ${roleName}`,
        details: { 
          role_name: roleName, 
          new_permissions: roleToUpdate.permissions,
          // You might want to log old permissions too for better auditing
        },
        target_entity: 'role',
        target_id: roleName // Assuming roleName is unique identifier for roles
      });
      if (logError) {
        console.error('Error logging activity:', logError);
        toast({
          title: 'Gagal Mencatat Aktivitas',
          description: 'Perubahan izin berhasil, tetapi gagal dicatat dalam log aktivitas.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Perubahan Izin Disimpan & Dicatat',
          description: `Izin untuk ${roleName} telah diperbarui dan aktivitas dicatat.`,
        });
      }
    } else {
      toast({ // Fallback if user.id is not available for some reason
        title: 'Perubahan Izin Disimulasikan (Log Gagal)',
        description: `Izin untuk ${roleName} telah diperbarui (simulasi). Gagal mencatat aktivitas karena ID pengguna tidak tersedia.`,
        variant: 'default',
      });
    }

    // Original toast for simulation (can be removed if direct DB update is implemented)
    /* toast({ 
      title: 'Perubahan Izin Disimulasikan',
      description: `Izin untuk ${roleName} telah diperbarui (simulasi). Implementasikan penyimpanan ke database.`,
    }); */

    setChangedPermissions(prev => {
      const { [roleName]: _, ...rest } = prev;
      return rest;
    });
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Manajemen Peran</h2>
      
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={role.color}>{role.name}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Izin Akses:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(permissionLabels).map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox 
                        checked={role.permissions.includes(permission)}
                        disabled={!isSuperAdmin} // Enable only for Super Admin
                        onCheckedChange={(checked) => handlePermissionChange(role.name, permission, !!checked)}
                      />
                      <label className="text-sm">{permissionLabels[permission]}</label>
                    </div>
                  ))}
                </div>
              </div>
              {isSuperAdmin && changedPermissions[role.name] && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => handleSubmitChanges(role.name)} size="sm">
                    Simpan Perubahan untuk {role.name}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
