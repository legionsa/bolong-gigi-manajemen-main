
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Search, Plus, FileText } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientForm } from "./patient/PatientForm";
import { MedicalRecordViewer } from "./patient/MedicalRecordViewer";
import { MedicalRecordForm } from "./patient/MedicalRecordForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TableSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Pasien</TableHead>
          <TableHead>Nama Lengkap</TableHead>
          <TableHead>NIK</TableHead>
          <TableHead>No. Telepon</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell className="text-right space-x-2">
              <Skeleton className="h-8 w-[120px] inline-block" />
              <Skeleton className="h-8 w-[60px] inline-block" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

const PatientManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatientRecords, setViewingPatientRecords] = useState(null);
  const [isAddingMedicalRecord, setIsAddingMedicalRecord] = useState(false);

  const {
    patients,
    isLoading,
    addPatient,
    isAdding,
    updatePatient,
    isUpdating
  } = usePatients();
  const {
    toast
  } = useToast();
  const handleAddPatient = async formData => {
    try {
      await addPatient(formData);
      toast({
        title: "Sukses",
        description: "Pasien baru berhasil ditambahkan."
      });
      setFormOpen(false);
    } catch (error) {
      toast({
        title: "Gagal",
        description: `Gagal menambahkan pasien: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleUpdatePatient = async formData => {
    if (!editingPatient) return;
    try {
      await updatePatient({
        id: editingPatient.id,
        ...formData
      });
      toast({
        title: "Sukses",
        description: "Data pasien berhasil diperbarui."
      });
      setEditingPatient(null);
    } catch (error) {
      let description = `Gagal memperbarui data pasien: ${error.message}`;
      if (error.message.includes('patient_number_unique')) {
        description = "Gagal memperbarui: No. Pasien tersebut sudah digunakan. Silakan gunakan nomor lain.";
      }
      toast({
        title: "Gagal",
        description,
        variant: "destructive"
      });
    }
  };

  const filteredPatients = patients?.filter(p => 
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.nik.includes(searchTerm) || 
      p.phone_number.includes(searchTerm) ||
      p.patient_number?.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-600" />Manajemen Pasien</CardTitle>
              <CardDescription>Kelola data pasien sesuai dengan Permenkes No. 24/2022</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Tambah Pasien</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Tambah Pasien Baru</DialogTitle>
                  <DialogDescription>Masukkan data pasien baru. Pastikan NIK valid dan lengkap.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
                  <PatientForm onSubmit={handleAddPatient} initialData={undefined} />
                </div>
                <DialogFooter>
                  <Button type="submit" form="patient-form" disabled={isAdding} className="bg-blue-600 hover:bg-blue-700">
                    {isAdding ? 'Menyimpan...' : 'Simpan Pasien'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input placeholder="Cari berdasarkan nama, NIK, No. Pasien, atau nomor telepon..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>

          {isLoading ? <TableSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pasien</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>No. Telepon</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.patient_number}</TableCell>
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell>{patient.nik}</TableCell>
                      <TableCell>{patient.phone_number}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setViewingPatientRecords(patient)}>
                          <FileText className="w-4 h-4 mr-1" />
                          Rekam Medis
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingPatient(patient)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Tidak ada pasien ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPatient} onOpenChange={isOpen => !isOpen && setEditingPatient(null)}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Pasien</DialogTitle>
            <DialogDescription>Perbarui data pasien. Pastikan data akurat.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
            {editingPatient && <PatientForm onSubmit={handleUpdatePatient} initialData={editingPatient} />}
          </div>
          <DialogFooter>
            <Button type="submit" form="patient-form" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
              {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!viewingPatientRecords} onOpenChange={isOpen => {
        if (!isOpen) {
          setViewingPatientRecords(null);
          setIsAddingMedicalRecord(false);
        }
      }}>
        <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>Rekam Medis: {viewingPatientRecords?.full_name}</DialogTitle>
                <DialogDescription>No. Pasien: {viewingPatientRecords?.patient_number}</DialogDescription>
              </div>
              {!isAddingMedicalRecord && (
                <div className="text-right">
                  <div className="h-8" /> {/* Spacer for the close button */}
                  <Button onClick={() => setIsAddingMedicalRecord(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Rekam Medis
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
            {viewingPatientRecords && (
              isAddingMedicalRecord ? (
                <MedicalRecordForm 
                  patientId={viewingPatientRecords.id}
                  onSuccess={() => setIsAddingMedicalRecord(false)}
                  onCancel={() => setIsAddingMedicalRecord(false)}
                />
              ) : (
                <MedicalRecordViewer patientId={viewingPatientRecords.id} />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default PatientManagement;
