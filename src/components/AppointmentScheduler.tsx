import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Pen, Video, Building2 } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useBranches } from "@/hooks/useBranches";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentForm } from "./appointment/AppointmentForm";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";

const getStatusColor = status => {
  switch (status) {
    case 'confirmed':
    case 'Dijadwalkan':
      return 'bg-primary-fixed text-on-primary-fixed';
    case 'in-progress':
    case 'Berlangsung':
      return 'bg-tertiary-fixed text-on-tertiary-fixed';
    case 'completed':
    case 'Selesai':
      return 'bg-secondary-fixed text-on-secondary-fixed';
    case 'cancelled':
    case 'Dibatalkan':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
};
const getStatusText = status => {
  switch (status) {
    case 'confirmed':
      return 'Terkonfirmasi';
    case 'Dijadwalkan':
      return 'Dijadwalkan';
    case 'in-progress':
    case 'Berlangsung':
      return 'Berlangsung';
    case 'completed':
    case 'Selesai':
      return 'Selesai';
    case 'cancelled':
    case 'Dibatalkan':
      return 'Dibatalkan';
    default:
      return 'Tidak Diketahui';
  }
};
const AppointmentCard = ({
  appointment,
  onUpdateStatus,
  isUpdating,
  onEdit,
  branchName
}: {
  appointment: Record<string, any>;
  onUpdateStatus: (id: string, status: string) => void;
  isUpdating: boolean;
  onEdit: () => void;
  branchName?: string;
}) => {
  const isTelehealth = appointment.appointment_type === 'telehealth';

  return <Card key={appointment.id} className="bg-surface-container-lowest transition-all hover:shadow-md hover:shadow-primary/5">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isTelehealth ? 'bg-primary/10' : 'bg-secondary-fixed'}`}>
                <div>
                    {isTelehealth ? (
                      <Video className="w-5 h-5 text-primary mx-auto mb-1" />
                    ) : (
                      <Clock className="w-5 h-5 text-on-secondary-fixed mx-auto mb-1" />
                    )}
                    <div className={`text-xs font-semibold ${isTelehealth ? 'text-primary' : 'text-on-secondary-fixed'}`}>
                        {new Date(appointment.appointment_date_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })}
                    </div>
                </div>
            </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-semibold text-on-surface">{appointment.patient_name}</h4>
              <Badge className={getStatusColor(appointment.status)}>{getStatusText(appointment.status)}</Badge>
              {isTelehealth && (
                <Badge variant="outline" className="gap-1 text-primary border-primary/50 bg-primary/5">
                  <Video className="w-3 h-3" />
                  Telehealth
                </Badge>
              )}
              {branchName && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Building2 className="w-3 h-3" />
                  {branchName}
                </Badge>
              )}
            </div>
            <p className="text-sm text-on-surface-variant mb-1">{appointment.service_name}</p>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <span>Dr. {appointment.dentist_name}</span>
              <span>{appointment.duration_in_minutes} menit</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5"><Pen className="w-4 h-4" />Edit</Button>
            {(appointment.status === 'Dijadwalkan' || appointment.status === 'confirmed') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="medical">Selesai</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-surface-container-lowest">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Penyelesaian</AlertDialogTitle>
                    <AlertDialogDescription>
                      Apakah Anda yakin ingin menandai appointment ini sebagai "Selesai"?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onUpdateStatus(appointment.id, 'Selesai')} disabled={isUpdating}>
                      {isUpdating ? 'Menyelesaikan...' : 'Ya, Selesaikan'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
        </div>
      </div>
    </CardContent>
  </Card>;
};
const AppointmentScheduler = () => {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'in_clinic' | 'telehealth'>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [branchMap, setBranchMap] = useState<Record<string, string>>({});
  const {
    appointments,
    isLoading,
    addAppointment,
    isAdding,
    updateAppointment,
    isUpdating
  } = useAppointments();
  const {
    branches
  } = useBranches(clinicId || undefined);
  const {
    toast
  } = useToast();

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

  // Build branch map for quick lookup
  useEffect(() => {
    if (branches.length > 0) {
      const map: Record<string, string> = {};
      branches.forEach(b => {
        map[b.id] = b.name;
      });
      setBranchMap(map);
    }
  }, [branches]);

  const handleViewChange = (newView: 'daily' | 'weekly' | 'monthly' | null) => {
    if (newView) {
      setView(newView);
    }
  };

  const goToPreviousPeriod = () => {
    if (view === 'daily') {
      setCurrentDate(prev => sub(prev, { days: 1 }));
    } else if (view === 'weekly') {
      setCurrentDate(prev => sub(prev, { weeks: 1 }));
    } else {
      setCurrentDate(prev => sub(prev, { months: 1 }));
    }
  };

  const goToNextPeriod = () => {
    if (view === 'daily') {
      setCurrentDate(prev => add(prev, { days: 1 }));
    } else if (view === 'weekly') {
      setCurrentDate(prev => add(prev, { weeks: 1 }));
    } else {
      setCurrentDate(prev => add(prev, { months: 1 }));
    }
  };

  const getHeaderText = () => {
    if (view === 'daily') {
      return format(currentDate, "eeee, d MMMM yyyy", { locale: idLocale });
    }
    if (view === 'weekly') {
      const start = startOfWeek(currentDate, { locale: idLocale, weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { locale: idLocale, weekStartsOn: 1 });
      if (format(start, 'MMMM') === format(end, 'MMMM')) {
        return `Minggu: ${format(start, 'd')} - ${format(end, 'd MMMM yyyy')}`;
      }
      return `Minggu: ${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
    }
    if (view === 'monthly') {
      return format(currentDate, "MMMM yyyy", { locale: idLocale });
    }
    return '';
  };

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];

    const filtered = appointments.filter(appt => {
      // Filter by type
      if (typeFilter !== 'all') {
        const apptType = appt.appointment_type || 'in_clinic';
        if (apptType !== typeFilter) return false;
      }

      // Filter by branch
      if (selectedBranchId !== "all" && appt.branch_id !== selectedBranchId) {
        return false;
      }

      const apptDate = new Date(appt.appointment_date_time);
      if (view === 'daily') {
        return isSameDay(apptDate, currentDate);
      }
      if (view === 'weekly') {
        const start = startOfWeek(currentDate, { locale: idLocale, weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { locale: idLocale, weekStartsOn: 1 });
        return isWithinInterval(apptDate, { start, end });
      }
      if (view === 'monthly') {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return isWithinInterval(apptDate, { start, end });
      }
      return false;
    });

    return filtered.sort((a, b) => new Date(a.appointment_date_time).getTime() - new Date(b.appointment_date_time).getTime());
  }, [appointments, view, currentDate, typeFilter, selectedBranchId]);

  const handleAddAppointment = async formData => {
    try {
      await addAppointment(formData);
      toast({
        title: "Sukses",
        description: "Appointment baru berhasil dijadwalkan."
      });
      setFormOpen(false);
    } catch (error) {
      toast({
        title: "Gagal",
        description: `Gagal menjadwalkan appointment: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateAppointment({ id, status });
      toast({
        title: "Sukses",
        description: "Status appointment berhasil diperbarui."
      });
    } catch (error) {
      toast({
        title: "Gagal",
        description: `Gagal memperbarui status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleEditClick = (appointment) => {
    setSelectedAppointment(appointment);
    setEditFormOpen(true);
  };

  const handleUpdateAppointment = async (formData) => {
    if (!selectedAppointment) return;

    try {
      await updateAppointment({
        id: selectedAppointment.id,
        ...formData
      });
      toast({
        title: "Sukses",
        description: "Appointment berhasil diperbarui."
      });
      setEditFormOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      toast({
        title: "Gagal",
        description: `Gagal memperbarui appointment: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return <div className="space-y-6">
      <Dialog open={isEditFormOpen} onOpenChange={(isOpen) => {
        setEditFormOpen(isOpen);
        if (!isOpen) {
          setSelectedAppointment(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh] bg-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="text-on-surface">Edit Appointment</DialogTitle>
            <DialogDescription>Perbarui detail appointment.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
            {selectedAppointment && (
              <AppointmentForm
                onSubmit={handleUpdateAppointment}
                initialData={selectedAppointment}
              />
            )}
          </div>
          <DialogFooter>
            <Button type="submit" form="appointment-form" disabled={isUpdating} variant="medical" className="gap-2">
              {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="bg-surface-container-lowest shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-on-secondary-fixed" />
                </div>
                Jadwal Appointment
              </CardTitle>
              <CardDescription className="mt-2">Kelola jadwal appointment pasien harian</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild><Button variant="medical" className="gap-2 w-full sm:w-auto justify-center"><Plus className="w-4 h-4" />Buat Appointment</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh] bg-[hsl(0,0%,100%)]">
                <DialogHeader>
                  <DialogTitle className="text-on-surface">Buat Appointment Baru</DialogTitle>
                  <DialogDescription>Jadwalkan appointment untuk pasien</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
                  <AppointmentForm onSubmit={handleAddAppointment} />
                </div>
                <DialogFooter>
                  <Button type="submit" form="appointment-form" disabled={isAdding} variant="medical" className="gap-2">
                    {isAdding ? 'Menjadwalkan...' : 'Buat Appointment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Type filter */}
              <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => v && setTypeFilter(v as typeof typeFilter)} defaultValue="all">
                <ToggleGroupItem value="all">Semua</ToggleGroupItem>
                <ToggleGroupItem value="in_clinic">Kunjungan Langsung</ToggleGroupItem>
                <ToggleGroupItem value="telehealth">
                  <span className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    Telehealth
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>

              {/* View toggle */}
              <ToggleGroup type="single" value={view} onValueChange={handleViewChange} defaultValue="daily">
                <ToggleGroupItem value="daily">Harian</ToggleGroupItem>
                <ToggleGroupItem value="weekly">Mingguan</ToggleGroupItem>
                <ToggleGroupItem value="monthly">Bulanan</ToggleGroupItem>
              </ToggleGroup>

              {/* Branch filter */}
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[160px] bg-surface-container-low border-0">
                  <SelectValue placeholder="Semua Cabin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabin</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {view === 'daily' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="date-picker" className="text-sm font-medium text-on-surface-variant">Tanggal:</Label>
                <Input
                  id="date-picker"
                  type="date"
                  value={format(currentDate, 'yyyy-MM-dd')}
                  onChange={e => setCurrentDate(new Date(e.target.value + 'T00:00:00'))}
                  className="w-48 bg-surface-container-low border-0"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 border-y border-outline-variant/20 py-3">
            <Button variant="outline" size="icon" onClick={goToPreviousPeriod} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-on-surface text-center">
              {getHeaderText()}
            </h3>
            <Button variant="outline" size="icon" onClick={goToNextPeriod} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {isLoading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />) : filteredAppointments.length > 0 ? filteredAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} onUpdateStatus={handleUpdateStatus} isUpdating={isUpdating} onEdit={() => handleEditClick(appointment)} branchName={appointment.branch_id ? branchMap[appointment.branch_id] : undefined} />) : <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-on-surface mb-2">Tidak ada appointment</h3>
                <p className="text-on-surface-variant">Tidak ada jadwal untuk periode ini. Buat appointment baru.</p>
              </div>}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default AppointmentScheduler;
