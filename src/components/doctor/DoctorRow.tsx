
import { Fragment } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Trash2, Plus } from "lucide-react";
import { DoctorScheduleList } from "./schedule/DoctorScheduleList";

export const DoctorRow = ({ 
  doctor, 
  isSelected, 
  onSelect,
  onEditDoctor,
  onDeleteDoctor,
  onOpenScheduleModal,
  onDeleteSchedule,
  schedules,
  isLoadingSchedules,
}: {
  doctor: any,
  isSelected: boolean,
  onSelect: () => void,
  onEditDoctor: (doctor: any) => void,
  onDeleteDoctor: (id: string) => void,
  onOpenScheduleModal: (doctor: any, schedule: any) => void,
  onDeleteSchedule: (id: string) => void,
  schedules: any[],
  isLoadingSchedules: boolean,
}) => {
  return (
    <Fragment>
      <TableRow>
        <TableCell className="font-medium">{doctor.full_name}</TableCell>
        <TableCell>{doctor.email}</TableCell>
        <TableCell>
          <Badge variant="secondary">{doctor.role_name}</Badge>
        </TableCell>
        <TableCell className="text-right space-x-1">
            <Button size="sm" variant="outline" onClick={onSelect}>
            {isSelected ? "Tutup Jadwal" : "Lihat Jadwal"}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onEditDoctor(doctor)}><PenLine className="w-4 h-4" /></Button>
          <Button size="icon" variant="destructive" onClick={() => onDeleteDoctor(doctor.id)}><Trash2 className="w-4 h-4" /></Button>
        </TableCell>
      </TableRow>
      {isSelected && (
        <TableRow>
          <TableCell colSpan={4} className="p-0">
            <div className="p-4 bg-muted/10">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-sm font-medium">Jadwal untuk Dr. {doctor.full_name}</strong>
                <Button size="sm" variant="outline" onClick={() => onOpenScheduleModal(doctor, null)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Jadwal
                </Button>
              </div>
              {isLoadingSchedules && <div>Memuat jadwal...</div>}
              {!isLoadingSchedules && (
                <DoctorScheduleList 
                  schedules={schedules || []} 
                  onEdit={(sched) => onOpenScheduleModal(doctor, sched)} 
                  onDelete={onDeleteSchedule} 
                />
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
