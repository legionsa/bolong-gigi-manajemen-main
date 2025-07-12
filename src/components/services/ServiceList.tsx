
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ServiceForm } from './ServiceForm';
import { useServices } from '@/hooks/useServices';

export const ServiceList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const { services, isLoading, deleteService } = useServices();

  const handleEdit = (service: any) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus layanan ini?')) {
      try {
        await deleteService(serviceId);
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingService(null);
  };

  if (isLoading) {
    return <div>Memuat daftar layanan...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daftar Layanan</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Layanan
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceForm 
              service={editingService} 
              onClose={handleClose} 
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {services?.map((service) => (
          <Card key={service.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p className="text-lg font-bold text-green-600">Rp {service.price.toLocaleString()}</p>
                    {service.category && (
                      <p className="text-sm text-muted-foreground">Kategori: {service.category}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Durasi: {service.duration_minutes} menit</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(service.id)}>
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
