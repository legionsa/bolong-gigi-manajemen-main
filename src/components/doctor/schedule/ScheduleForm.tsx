
import { useForm, useWatch } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { DAYS_OF_WEEK } from "@/lib/constants";

export function ScheduleForm({
  initialData,
  onSubmit,
  loading
}: {
  initialData: any,
  onSubmit: (data: any) => void,
  loading: boolean
}) {
  const form = useForm({
    defaultValues: {
      date: initialData?.date || "",
      day_of_week: initialData?.day_of_week?.toString() || "",
      start_time: initialData?.start_time || "09:00:00",
      end_time: initialData?.end_time || "13:00:00",
      id: initialData?.id,
      schedule_type: initialData?.day_of_week ? 'recurring' : 'specific'
    }
  });

  const scheduleType = useWatch({
    control: form.control,
    name: "schedule_type"
  });

  const handleFormSubmit = (data: any) => {
    const payload: {
        start_time: string,
        end_time: string,
        date: string | null,
        day_of_week: number | null,
        id?: string
    } = {
      start_time: data.start_time,
      end_time: data.end_time,
      date: data.schedule_type === 'specific' ? data.date : null,
      day_of_week: data.schedule_type === 'recurring' ? parseInt(data.day_of_week, 10) : null
    };

    if (data.id) {
      payload.id = data.id;
    }
    
    onSubmit(payload);
  };

  return <form id="schedule-form" className="space-y-3 pt-3" onSubmit={form.handleSubmit(handleFormSubmit)}>
      <div>
        <label className="block text-sm font-medium">Tipe Jadwal</label>
        <Select onValueChange={(value) => form.setValue('schedule_type', value)} defaultValue={form.getValues('schedule_type')}>
            <SelectTrigger>
                <SelectValue placeholder="Pilih tipe jadwal" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="specific">Tanggal Spesifik</SelectItem>
                <SelectItem value="recurring">Jadwal Mingguan</SelectItem>
            </SelectContent>
        </Select>
      </div>

      {scheduleType === 'specific' && (
        <div>
          <label className="block text-sm font-medium">Tanggal</label>
          <input type="date" {...form.register("date", { required: scheduleType === 'specific' })} className="mt-1 w-full border rounded px-2 py-1" />
        </div>
      )}
      
      {scheduleType === 'recurring' && (
         <div>
            <label className="block text-sm font-medium">Hari</label>
            <Select onValueChange={(value) => form.setValue('day_of_week', value)} defaultValue={form.getValues('day_of_week')}>
                <SelectTrigger>
                    <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.id} value={day.id.toString()}>{day.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
         </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium">Jam Mulai</label>
          <input type="time" {...form.register("start_time", {
          required: true
        })} step="1800" className="mt-1 w-full border rounded px-2 py-1" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Jam Selesai</label>
          <input type="time" {...form.register("end_time", {
          required: true
        })} step="1800" className="mt-1 w-full border rounded px-2 py-1" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" form="schedule-form" className="bg-purple-600 hover:bg-purple-700 text-white w-full" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Jadwal"}
        </Button>
      </DialogFooter>
    </form>;
}
