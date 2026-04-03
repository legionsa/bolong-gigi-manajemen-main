import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UiDialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Plus, Building2 } from "lucide-react";
import { DoctorForm } from "./doctor/DoctorForm";
import { useDoctors } from "@/hooks/useDoctors";
import { useDoctorSchedules } from "@/hooks/useDoctorSchedules";
import { useBranches, useDoctorBranches } from "@/hooks/useBranches";
import { useToast } from "@/hooks/use-toast";
import { checkScheduleOverlap } from "@/utils/schedule";
import { DoctorTable } from "./doctor/DoctorTable";
import { DoctorTableSkeleton } from "./doctor/DoctorTableSkeleton";
import { ScheduleForm } from "./doctor/schedule/ScheduleForm";
import { supabase } from "@/integrations/supabase/client";

const DialogDescription = (props: React.ComponentProps<typeof UiDialogDescription>) => <UiDialogDescription {...props} className="mt-2" />;

export default function DoctorManagement() {
  const { toast } = useToast();
  const { doctors, isLoading, addDoctor, adding, updateDoctor, updating, deleteDoctor } = useDoctors();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [scheduleModal, setScheduleModal] = useState<{open: boolean, doctor: any, schedule: any}>({ open: false, doctor: null, schedule: null });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // Branch assignment state
  const [branchModal, setBranchModal] = useState<{open: boolean, doctor: any}>({ open: false, doctor: null });
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [doctorBranchMap, setDoctorBranchMap] = useState<Record<string, string[]>>({});

  const { schedules, isLoading: loadingSchedules, addSchedule, updateSchedule, updateLoading, deleteSchedule } = useDoctorSchedules(selectedDoctorId);
  const { branches, linkDoctorToBranch, unlinkDoctorFromBranch, isLinkingDoctor } = useBranches(clinicId || undefined);

  // Get clinic_id on mount
  useEffect(() => {
    const getClinicId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cu } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .eq('role', 'clinic_admin')
        .single();

      if (cu) {
        setClinicId(cu.clinic_id);
      }
    };
    getClinicId();
  }, []);

  // Fetch doctor branches for all doctors when clinicId changes
  useEffect(() => {
    const fetchDoctorBranches = async () => {
      if (!clinicId || !doctors?.length) return;

      const branchMap: Record<string, string[]> = {};

      for (const doctor of doctors) {
        const { data: doctorBranches } = await supabase
          .from('doctor_branches')
          .select(`
            *,
            branch:branches(*)
          `)
          .eq('doctor_id', doctor.id);

        if (doctorBranches) {
          branchMap[doctor.id] = doctorBranches
            .map((db: any) => db.branch?.name)
            .filter(Boolean);
        }
      }

      setDoctorBranchMap(branchMap);
    };

    fetchDoctorBranches();
  }, [clinicId, doctors]);

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

  // Handle branch assignment
  const handleOpenBranchModal = async (doctor: any) => {
    // Fetch current branches for this doctor
    const { data: currentBranches } = await supabase
      .from('doctor_branches')
      .select('branch_id')
      .eq('doctor_id', doctor.id);

    const currentBranchIds = currentBranches?.map(b => b.branch_id) || [];
    setSelectedBranchIds(currentBranchIds);
    setBranchModal({ open: true, doctor });
  };

  const handleCloseBranchModal = () => {
    setBranchModal({ open: false, doctor: null });
    setSelectedBranchIds([]);
  };

  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSaveBranches = async () => {
    if (!branchModal.doctor) return;

    const doctorId = branchModal.doctor.id;
    const currentBranchIds = selectedBranchIds;

    // Get existing branches
    const { data: existingBranches } = await supabase
      .from('doctor_branches')
      .select('branch_id')
      .eq('doctor_id', doctorId);

    const existingBranchIds = existingBranches?.map(b => b.branch_id) || [];

    // Branches to add
    const toAdd = currentBranchIds.filter(id => !existingBranchIds.includes(id));

    // Branches to remove
    const toRemove = existingBranchIds.filter(id => !currentBranchIds.includes(id));

    try {
      // Add new branches
      for (const branchId of toAdd) {
        await linkDoctorToBranch({
          doctorId,
          branchId,
          isPrimary: currentBranchIds.length === 1 && toAdd.length === 1,
        });
      }

      // Remove unselected branches
      for (const branchId of toRemove) {
        await unlinkDoctorFromBranch({ doctorId, branchId });
      }

      toast({ title: "Sukses", description: "Cabang dokter berhasil diperbarui." });

      // Refresh branch map
      const { data: updatedBranches } = await supabase
        .from('doctor_branches')
        .select('branch_id, branch:branches(*)')
        .eq('doctor_id', doctorId);

      if (updatedBranches) {
        setDoctorBranchMap(prev => ({
          ...prev,
          [doctorId]: updatedBranches
            .map((db: any) => db.branch?.name)
            .filter(Boolean)
        }));
      }

      handleCloseBranchModal();
    } catch (e) {
      toast({ title: "Gagal", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-surface-container-lowest shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center">
                <User className="w-5 h-5 text-on-secondary-fixed" />
              </div>
              Manajemen Dokter
            </CardTitle>
            <CardDescription className="mt-2">
              Kelola data dokter dan jadwal ketersediaan.
            </CardDescription>
          </div>
          <Button onClick={() => setModalOpen(true)} variant="medical" className="gap-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
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
            onAssignBranches={handleOpenBranchModal}
            schedules={schedules || []}
            isLoadingSchedules={loadingSchedules}
            doctorBranchNames={doctorBranchMap}
          />
        )}

        {/* Doctor Modal */}
        <Dialog open={modalOpen || !!editingDoctor} onOpenChange={() => { setModalOpen(false); setEditingDoctor(null); }}>
          <DialogContent className="bg-surface-container-lowest">
            <DialogHeader>
              <DialogTitle className="text-on-surface">{editingDoctor ? "Edit Dokter" : "Tambah Dokter"}</DialogTitle>
              <DialogDescription>
                {editingDoctor ? "Ubah detail dokter yang sudah ada." : "Isi form di bawah ini untuk menambahkan dokter baru."}
              </DialogDescription>
            </DialogHeader>
            <DoctorForm initialData={editingDoctor} onSubmit={editingDoctor ? handleEditDoctor : handleAddDoctor} submitting={editingDoctor ? updating : adding} />
          </DialogContent>
        </Dialog>

        {/* Schedule Modal */}
        <Dialog open={scheduleModal.open} onOpenChange={() => setScheduleModal({ open: false, doctor: null, schedule: null })}>
          <DialogContent className="bg-surface-container-lowest">
            <DialogHeader>
              <DialogTitle className="text-on-surface">{scheduleModal.schedule ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
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

        {/* Branch Assignment Modal */}
        <Dialog open={branchModal.open} onOpenChange={handleCloseBranchModal}>
          <DialogContent className="bg-surface-container-lowest sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-on-surface flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Assign Cabin
              </DialogTitle>
              <DialogDescription>
                Pilih cabin tempat Dr. {branchModal.doctor?.full_name} praktik.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada cabin. Tambahkan cabin terlebih dahulu.
                </p>
              ) : (
                branches.map(branch => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={selectedBranchIds.includes(branch.id)}
                      onCheckedChange={() => handleToggleBranch(branch.id)}
                    />
                    <Label
                      htmlFor={`branch-${branch.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {branch.name}
                      {branch.is_main && (
                        <span className="ml-2 text-xs text-primary">(Utama)</span>
                      )}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseBranchModal}>
                Batal
              </Button>
              <Button
                variant="medical"
                onClick={handleSaveBranches}
                disabled={isLinkingDoctor}
                className="gap-2"
              >
                {isLinkingDoctor ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
