
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoctorRow } from "./DoctorRow";

export const DoctorTable = ({ 
  doctors, 
  selectedDoctorId, 
  setSelectedDoctorId,
  onEditDoctor,
  onDeleteDoctor,
  onOpenScheduleModal,
  onDeleteSchedule,
  schedules,
  isLoadingSchedules
}: {
  doctors: any[],
  selectedDoctorId: string | null,
  setSelectedDoctorId: React.Dispatch<React.SetStateAction<string | null>>,
  onEditDoctor: (doctor: any) => void,
  onDeleteDoctor: (id: string) => void,
  onOpenScheduleModal: (doctor: any, schedule: any) => void,
  onDeleteSchedule: (id: string) => void,
  schedules: any[],
  isLoadingSchedules: boolean
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama Lengkap</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Peran</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {doctors.length === 0 && <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              Belum ada dokter.
            </TableCell>
          </TableRow>}
        {doctors.map(doctor => (
          <DoctorRow 
            key={doctor.id}
            doctor={doctor}
            isSelected={selectedDoctorId === doctor.id}
            onSelect={() => setSelectedDoctorId(prev => prev === doctor.id ? null : doctor.id)}
            onEditDoctor={onEditDoctor}
            onDeleteDoctor={onDeleteDoctor}
            onOpenScheduleModal={onOpenScheduleModal}
            onDeleteSchedule={onDeleteSchedule}
            schedules={selectedDoctorId === doctor.id ? schedules : []}
            isLoadingSchedules={selectedDoctorId === doctor.id ? isLoadingSchedules : false}
          />
        ))}
      </TableBody>
    </Table>
  );
}
