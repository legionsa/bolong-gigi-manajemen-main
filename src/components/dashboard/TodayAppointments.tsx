
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { format, addDays, subDays, isToday } from 'date-fns';
import { id } from 'date-fns/locale';

export const TodayAppointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, isLoading } = useAppointments();

  const filteredAppointments = appointments?.filter(appt => {
    const appointmentDate = new Date(appt.appointment_date_time);
    return format(appointmentDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  }) || [];

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Jadwal {isToday(selectedDate) ? 'Hari Ini' : format(selectedDate, 'dd MMMM yyyy', { locale: id })}
            </CardTitle>
            <CardDescription>
              {filteredAppointments.length} janji temu pada {format(selectedDate, 'dd MMMM yyyy', { locale: id })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {!isToday(selectedDate) && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hari Ini
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={goToNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Memuat jadwal...</p>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{appointment.patient_name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.service_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {appointment.dentist_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {format(new Date(appointment.appointment_date_time), 'HH:mm')}
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Tidak ada jadwal pada tanggal ini</p>
        )}
      </CardContent>
    </Card>
  );
};
