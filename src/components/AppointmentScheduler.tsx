import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Pen } from "lucide-react";
import { useAppointments } from "@/hooks/useAppointments";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentForm } from "./appointment/AppointmentForm";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format, add, sub, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const getStatusColor = status => {
  switch (status) {
    case 'confirmed':
    case 'Dijadwalkan':
      return 'bg-blue-100 text-blue-800';
    case 'in-progress':
    case 'Berlangsung':
      return 'bg-green-100 text-green-800';
    case 'completed':
    case 'Selesai':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
    case 'Dibatalkan':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
  onEdit
}) => <Card key={appointment.id} className="transition-all hover:shadow-md">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <div>
                    <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-blue-600">
                        {new Date(appointment.appointment_date_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })}
                    </div>
                </div>
            </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{appointment.patient_name}</h4>
              <Badge className={getStatusColor(appointment.status)}>{getStatusText(appointment.status)}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">{appointment.service_name}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>👨‍⚕️ {appointment.dentist_name}</span>
              <span>⏱️ {appointment.duration_in_minutes} menit</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Pen className="w-4 h-4 mr-2" />Edit</Button>
            {(appointment.status === 'Dijadwalkan' || appointment.status === 'confirmed') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">Selesai</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
const AppointmentScheduler = () => {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const {
    appointments,
    isLoading,
    addAppointment,
    isAdding,
    updateAppointment,
    isUpdating
  } = useAppointments();
  const {
    toast
  } = useToast();

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
  }, [appointments, view, currentDate]);

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
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
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
            <Button type="submit" form="appointment-form" disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
              {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />Jadwal Appointment</CardTitle>
              <CardDescription>Kelola jadwal appointment pasien harian</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Buat Appointment</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Buat Appointment Baru</DialogTitle>
                  <DialogDescription>Jadwalkan appointment untuk pasien</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto py-4 pr-6 -mr-6">
                  <AppointmentForm onSubmit={handleAddAppointment} />
                </div>
                <DialogFooter>
                  <Button type="submit" form="appointment-form" disabled={isAdding} className="bg-blue-600 hover:bg-blue-700">
                    {isAdding ? 'Menjadwalkan...' : 'Buat Appointment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <ToggleGroup type="single" value={view} onValueChange={handleViewChange} defaultValue="daily">
              <ToggleGroupItem value="daily">Harian</ToggleGroupItem>
              <ToggleGroupItem value="weekly">Mingguan</ToggleGroupItem>
              <ToggleGroupItem value="monthly">Bulanan</ToggleGroupItem>
            </ToggleGroup>

            {view === 'daily' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="date-picker" className="text-sm font-medium">Pilih Tanggal:</Label>
                <Input 
                  id="date-picker" 
                  type="date" 
                  value={format(currentDate, 'yyyy-MM-dd')} 
                  onChange={e => setCurrentDate(new Date(e.target.value + 'T00:00:00'))} 
                  className="w-48" 
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mb-4 border-y py-2">
            <Button variant="outline" size="icon" onClick={goToPreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              {getHeaderText()}
            </h3>
            <Button variant="outline" size="icon" onClick={goToNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {isLoading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />) : filteredAppointments.length > 0 ? filteredAppointments.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} onUpdateStatus={handleUpdateStatus} isUpdating={isUpdating} onEdit={() => handleEditClick(appointment)} />) : <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Tidak ada appointment</h3>
                <p className="text-gray-500">Tidak ada jadwal untuk periode ini. Buat appointment baru.</p>
              </div>}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default AppointmentScheduler;
