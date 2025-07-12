
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription } from "@/components/ui/dialog";
import { User, Plus } from "lucide-react";
import { DoctorForm } from "./doctor/DoctorForm";
import { useDoctors } from "@/hooks/useDoctors";
import { useDoctorSchedules } from "@/hooks/useDoctorSchedules";
import { useToast } from "@/hooks/use-toast";
import { checkScheduleOverlap } from "@/utils/schedule";
import { DoctorTable } from "./doctor/DoctorTable";
import { DoctorTableSkeleton } from "./doctor/DoctorTableSkeleton";
import { ScheduleForm } from "./doctor/schedule/ScheduleForm";

const DialogDescription = (props: React.ComponentProps<typeof UiDialogDescription>) => <UiDialogDescription {...props} className="mt-2" />;

export default function DoctorManagement() {
  const { toast } = useToast();
  const { doctors, isLoading, addDoctor, adding, updateDoctor, updating, deleteDoctor } = useDoctors();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [scheduleModal, setScheduleModal] = useState<{open: boolean, doctor: any, schedule: any}>({ open: false, doctor: null, schedule: null });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const { schedules, isLoading: loadingSchedules, addSchedule, updateSchedule, updateLoading, deleteSchedule } = useDoctorSchedules(selectedDoctorId);

  const handleAddDoctor = async (formData: any) => {
    try {
      await addDoctor({ ...formData, role_name: "Dentist", role_id: "dentist" });
      toast({ title: "Sukses", description: "Dokter berhasil ditambahkan." });
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleEditDoctor = async (formData: any) => {
    try {
      await updateDoctor(formData);
      toast({ title: "Sukses", description: "Data dokter berhasil diperbarui." });
      setEditingDoctor(null);
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm("Hapus dokter ini?")) return;
    try {
      await deleteDoctor(id);
      if (id === selectedDoctorId) {
        setSelectedDoctorId(null);
      }
      toast({ title: "Sukses", description: "Dokter dihapus." });
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleAddSchedule = async (schedule: any) => {
    if (checkScheduleOverlap(schedule, schedules || [])) {
      toast({ title: "Jadwal Bertabrakan", description: "Waktu jadwal tumpang tindih dengan yang sudah ada.", variant: "destructive" });
      return;
    }
    try {
      await addSchedule({ ...schedule, doctor_id: selectedDoctorId });
      toast({ title: "Sukses", description: "Jadwal berhasil ditambah." });
      setScheduleModal({ open: false, doctor: null, schedule: null });
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleEditSchedule = async (schedule: any) => {
    if (checkScheduleOverlap(schedule, schedules || [])) {
      toast({ title: "Jadwal Bertabrakan", description: "Waktu jadwal tumpang tindih dengan yang sudah ada.", variant: "destructive" });
      return;
    }
    try {
      await updateSchedule(schedule);
      toast({ title: "Sukses", description: "Jadwal diupdate." });
      setScheduleModal({ open: false, doctor: null, schedule: null });
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Hapus jadwal ini?")) return;
    try {
      await deleteSchedule(id);
      toast({ title: "Sukses", description: "Jadwal dihapus." });
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Manajemen Dokter
            </CardTitle>
            <CardDescription>
              Kelola data dokter dan jadwal ketersediaan.
            </CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-500">
            <Plus className="w-4 h-4 mr-1" />
            Tambah Dokter
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? <DoctorTableSkeleton /> : (
          <DoctorTable 
            doctors={doctors || []}
            selectedDoctorId={selectedDoctorId}
            setSelectedDoctorId={setSelectedDoctorId}
            onEditDoctor={setEditingDoctor}
            onDeleteDoctor={handleDeleteDoctor}
            onOpenScheduleModal={(doctor, schedule) => setScheduleModal({ open: true, doctor, schedule })}
            onDeleteSchedule={handleDeleteSchedule}
            schedules={schedules || []}
            isLoadingSchedules={loadingSchedules}
          />
        )}

        {/* Doctor Modal */}
        <Dialog open={modalOpen || !!editingDoctor} onOpenChange={() => { setModalOpen(false); setEditingDoctor(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDoctor ? "Edit Dokter" : "Tambah Dokter"}</DialogTitle>
              <DialogDescription>
                {editingDoctor ? "Ubah detail dokter yang sudah ada." : "Isi form di bawah ini untuk menambahkan dokter baru."}
              </DialogDescription>
            </DialogHeader>
            <DoctorForm initialData={editingDoctor} onSubmit={editingDoctor ? handleEditDoctor : handleAddDoctor} submitting={editingDoctor ? updating : adding} />
          </DialogContent>
        </Dialog>

        {/* Schedule Modal */}
        <Dialog open={scheduleModal.open} onOpenChange={() => setScheduleModal({ open: false, doctor: null, schedule: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{scheduleModal.schedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
              <DialogDescription>
                Atur jadwal spesifik atau mingguan untuk dokter yang dipilih.
              </DialogDescription>
            </DialogHeader>
            <ScheduleForm 
              initialData={scheduleModal.schedule} 
              onSubmit={scheduleModal.schedule ? handleEditSchedule : handleAddSchedule} 
              loading={updateLoading} 
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
