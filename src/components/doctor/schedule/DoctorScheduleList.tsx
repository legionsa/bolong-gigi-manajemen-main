
import { Button } from "@/components/ui/button";
import { PenLine, Trash2 } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";

export const DoctorScheduleList = ({
  schedules,
  onEdit,
  onDelete
}: {
  schedules: any[],
  onEdit: (schedule: any) => void,
  onDelete: (id: string) => void
}) => <div className="mt-2 space-y-1">
    {schedules.length === 0 && <div className="text-muted-foreground text-xs">Belum ada jadwal untuk dokter ini.</div>}
    {schedules.map(s => <div key={s.id} className="flex items-center justify-between border rounded px-2 py-1">
        <div>
          <span className="font-medium">{s.date ? new Date(s.date + 'T00:00:00').toLocaleDateString("id-ID") : DAYS_OF_WEEK.find(d => d.id === s.day_of_week)?.name}</span>
          <span className="mx-2 text-sm">{s.start_time} - {s.end_time}</span>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(s)}><PenLine className="w-4 h-4" /></Button>
          <Button size="icon" variant="destructive" onClick={() => onDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>)}
  </div>;
