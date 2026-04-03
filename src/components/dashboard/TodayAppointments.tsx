import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal, Video } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useTelehealth } from '@/hooks/useTelehealth';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, subDays, isToday, differenceInMinutes } from 'date-fns';
import { id } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type StatusKey = 'confirmed' | 'scheduled' | 'cancelled' | 'completed' | string;

const STATUS_MAP: Record<StatusKey, { label: string; className: string }> = {
  confirmed:  { label: 'Konfirmasi', className: 'bg-primary-fixed/60 text-primary' },
  scheduled:  { label: 'Hadir',      className: 'bg-secondary-fixed text-on-secondary-fixed' },
  cancelled:  { label: 'Batal',      className: 'bg-destructive/10 text-destructive' },
  completed:  { label: 'Selesai',    className: 'bg-surface-container text-muted-foreground' },
};
const getStatus = (s: StatusKey) =>
  STATUS_MAP[s] ?? { label: s, className: 'bg-tertiary-fixed text-on-tertiary-fixed' };

/** Initials avatar for patients without a photo */
function PatientAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
  const colors = [
    'bg-primary-fixed text-primary',
    'bg-secondary-fixed text-on-secondary-fixed',
    'bg-tertiary-fixed text-on-tertiary-fixed',
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div
      className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0', color)}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export const TodayAppointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, isLoading } = useAppointments();
  const { sessionByAppointment, createSession, isCreatingSession } = useTelehealth();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [focusedRow, setFocusedRow] = useState<number>(-1);

  const filteredAppointments = appointments?.filter(appt => {
    const d = new Date(appt.appointment_date_time);
    return format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  }) || [];

  // ── Keyboard navigation: arrow keys between rows ──
  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number) => {
      const rows = tableRef.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!rows) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = rows[rowIndex + 1];
        next?.focus();
        setFocusedRow(rowIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = rows[rowIndex - 1];
        prev?.focus();
        setFocusedRow(rowIndex - 1);
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-extrabold text-primary font-headline">
          The Daily Drill
        </h3>
        <Button
          variant="link"
          size="sm"
          className="text-primary font-bold text-sm hover:no-underline"
          asChild
        >
          <a href="/dashboard?tab=appointments">Lihat Kalender</a>
        </Button>
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setSelectedDate(prev => subDays(prev, 1))}
          aria-label="Hari sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-on-surface min-w-[140px] text-center">
          {isToday(selectedDate)
            ? 'Hari Ini'
            : format(selectedDate, 'dd MMMM yyyy', { locale: id })}
        </span>
        {!isToday(selectedDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold text-primary"
            onClick={() => setSelectedDate(new Date())}
          >
            Hari Ini
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setSelectedDate(prev => addDays(prev, 1))}
          aria-label="Hari berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-surface-container-lowest rounded-3xl p-2 shadow-long overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 py-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" aria-hidden="true" />
            <p className="text-muted-foreground font-medium text-sm">
              Tidak ada jadwal — waktu luang untuk senyum lebih lebar!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-separate border-spacing-y-2 px-2"
              role="grid"
              aria-label={`Jadwal ${isToday(selectedDate) ? 'hari ini' : format(selectedDate, 'dd MMMM yyyy', { locale: id })}`}
            >
              <thead>
                <tr className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                  <th className="pb-2 pl-3" scope="col">Waktu</th>
                  <th className="pb-2" scope="col">Pasien</th>
                  <th className="pb-2 hidden sm:table-cell" scope="col">Prosedur</th>
                  <th className="pb-2" scope="col">Status</th>
                  <th className="pb-2 text-right pr-3" scope="col">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody ref={tableRef}>
                {filteredAppointments.map((appt, rowIndex) => {
                  const status = getStatus(appt.status);
                  const isEven = rowIndex % 2 === 0;
                  const isTelehealth = appt.appointment_type === 'telehealth';
                  const apptTime = new Date(appt.appointment_date_time);
                  const now = new Date();
                  // Check if appointment is within 15 minutes (either before or after now)
                  const canJoin = isTelehealth && appt.status === 'confirmed' &&
                    Math.abs(differenceInMinutes(apptTime, now)) <= 15;

                  const handleJoinCall = async () => {
                    if (!sessionByAppointment) return;
                    // Check if session exists
                    const { data: existingSession } = await supabase
                      .from('telehealth_sessions')
                      .select('id')
                      .eq('appointment_id', appt.id)
                      .maybeSingle();

                    if (existingSession) {
                      navigate(`/telehealth/${existingSession.id}`);
                    } else {
                      // Create session first
                      const session = await createSession({
                        appointment_id: appt.id,
                        host_name: `Dr. ${appt.dentist_name}`,
                        patient_name: appt.patient_name,
                      });
                      navigate(`/telehealth/${session.id}`);
                    }
                  };

                  return (
                    <tr
                      key={appt.id}
                      data-row
                      role="row"
                      tabIndex={0}
                      className={cn(
                        'group transition-colors rounded-2xl cursor-default',
                        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-inset',
                        isEven
                          ? 'bg-surface-container-low/50 hover:bg-primary/[0.03]'
                          : 'hover:bg-primary/[0.03]'
                      )}
                      onKeyDown={e => handleTableKeyDown(e, rowIndex)}
                      aria-rowindex={rowIndex + 2}
                      aria-label={`${format(new Date(appt.appointment_date_time), 'HH:mm')}, ${appt.patient_name}, ${appt.service_name}, Status: ${status.label}`}
                    >
                      {/* Time */}
                      <td className="py-4 pl-3 first:rounded-l-2xl" role="gridcell">
                        <div className="flex items-center gap-2">
                          {isTelehealth ? (
                            <Video className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : null}
                          <p className="text-sm font-bold text-primary whitespace-nowrap">
                            {format(new Date(appt.appointment_date_time), 'hh:mm a')}
                          </p>
                        </div>
                      </td>

                      {/* Patient */}
                      <td role="gridcell">
                        <div className="flex items-center gap-3">
                          <PatientAvatar name={appt.patient_name} />
                          <p className="text-sm font-semibold text-on-surface whitespace-nowrap">
                            {appt.patient_name}
                          </p>
                        </div>
                      </td>

                      {/* Procedure */}
                      <td className="hidden sm:table-cell" role="gridcell">
                        <p className="text-sm text-muted-foreground">{appt.service_name}</p>
                      </td>

                      {/* Status badge */}
                      <td role="gridcell">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider whitespace-nowrap',
                              status.className
                            )}
                          >
                            {status.label}
                          </span>
                          {isTelehealth && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                              <Video className="w-3 h-3 inline mr-0.5" />
                              Video
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="text-right pr-3 last:rounded-r-2xl" role="gridcell">
                        {canJoin ? (
                          <Button
                            size="sm"
                            variant="medical"
                            onClick={handleJoinCall}
                            disabled={isCreatingSession}
                            className="gap-1.5 h-8"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Gabung
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label={`Opsi untuk ${appt.patient_name}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
