import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { appointmentSchema } from '@/lib/schemas';
import { usePatients } from '@/hooks/usePatients';
import { useAvailableDoctors } from '@/hooks/useAvailableDoctors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const DENTAL_SERVICES = [
  "Pemeriksaan Rutin",
  "Pembersihan Karang Gigi",
  "Penambalan Gigi",
  "Pencabutan Gigi",
  "Konsultasi Ortodonti",
  "Perawatan Saluran Akar",
];

type AppointmentFormProps = {
  onSubmit: (values: any) => void;
  initialData?: any;
};

export const AppointmentForm = ({ onSubmit, initialData }: AppointmentFormProps) => {
  const { patients, isLoading: isLoadingPatients } = usePatients();

  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: initialData ? {
        patient_id: initialData.patient_id,
        dentist_id: initialData.dentist_id,
        appointment_date: format(new Date(initialData.appointment_date_time), 'yyyy-MM-dd'),
        appointment_time: format(new Date(initialData.appointment_date_time), 'HH:mm'),
        service_name: initialData.service_name,
        notes: initialData.notes || '',
    } : {
      patient_id: '',
      dentist_id: '',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      service_name: '',
      notes: '',
    },
  });

  const selectedDate = useWatch({
    control: form.control,
    name: 'appointment_date',
  });

  const { data: availableDentists, isLoading: isLoadingDentists } = useAvailableDoctors(selectedDate);
  
  const isLoading = isLoadingPatients;

  if (isLoading) {
      return (
          <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
      )
  }

  return (
    <Form {...form}>
      <form id="appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="patient_id"
          render={({ field }) => (
            <FormItem>
              <Label>Pasien</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Pilih pasien" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dentist_id"
          render={({ field }) => (
            <FormItem>
              <Label>Dokter</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedDate || isLoadingDentists}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedDate ? "Pilih tanggal dulu" : (isLoadingDentists ? "Mencari..." : "Pilih dokter")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingDentists && <SelectItem value="loading" disabled>Mencari dokter tersedia...</SelectItem>}
                  {!isLoadingDentists && availableDentists?.length === 0 && <SelectItem value="no-doctors" disabled>Tidak ada dokter tersedia</SelectItem>}
                  {availableDentists?.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="appointment_date"
          render={({ field }) => (
            <FormItem>
              <Label>Tanggal</Label>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="appointment_time"
          render={({ field }) => (
            <FormItem>
              <Label>Waktu</Label>
              <FormControl><Input type="time" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="service_name"
          render={({ field }) => (
            <FormItem>
              <Label>Layanan</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Pilih layanan" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DENTAL_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <Label>Catatan (Opsional)</Label>
              <FormControl><Input placeholder="Catatan tambahan..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
