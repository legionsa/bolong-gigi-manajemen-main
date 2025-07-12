
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientForm } from '@/components/patient/PatientForm';

export const RecentPatients = () => {
  const { patients, isLoading } = usePatients();
  const [showAddPatient, setShowAddPatient] = useState(false);

  // Get 5 most recent patients
  const recentPatients = patients
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pasien Terbaru
              </CardTitle>
              <CardDescription>
                {recentPatients.length} pasien terdaftar baru-baru ini
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddPatient(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pasien
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Memuat data pasien...</p>
          ) : recentPatients.length > 0 ? (
            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-sm text-muted-foreground">{patient.phone_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(patient.created_at), 'dd MMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Belum ada pasien terdaftar</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Pasien Baru</DialogTitle>
          </DialogHeader>
          <PatientForm onSubmit={async (data) => { 
            // TODO: Implement patient creation logic here
            console.log('New patient data:', data);
            setShowAddPatient(false); 
          }} initialData={null} />
        </DialogContent>
      </Dialog>
    </>
  );
};
