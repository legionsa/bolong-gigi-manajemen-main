
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { StaffForm } from './StaffForm';
import { useStaff } from '@/hooks/useStaff';

export const StaffList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const { staff, isLoading, deleteStaff } = useStaff();

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleDelete = async (staffId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus staff ini?')) {
      try {
        await deleteStaff(staffId);
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingStaff(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-red-100 text-red-800';
      case 'Admin': return 'bg-blue-100 text-blue-800';
      case 'Receptionist': return 'bg-green-100 text-green-800';
      case 'Dentist': return 'bg-purple-100 text-purple-800';
      case 'Assistant': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div>Memuat daftar staff...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daftar Staff</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Staff
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingStaff ? 'Edit Staff' : 'Tambah Staff Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffForm 
              staff={editingStaff} 
              onClose={handleClose} 
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {staff?.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{member.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  {member.phone_number && (
                    <p className="text-sm text-muted-foreground">{member.phone_number}</p>
                  )}
                  <div className="mt-2">
                    <Badge className={getRoleBadgeColor(member.role_name)}>
                      {member.role_name}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(member.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
