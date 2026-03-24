import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

interface TimeSlot {
  time: string
  available: boolean
}

interface TimeSlotPickerProps {
  doctorId: string
  selectedDate: string
  value: string
  onChange: (time: string) => void
  className?: string
}

export function TimeSlotPicker({
  doctorId,
  selectedDate,
  value,
  onChange,
  className = '',
}: TimeSlotPickerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
        slots.push({ time: timeStr, available: true })
      }
    }
    return slots
  }

  useEffect(() => {
    if (!doctorId || !selectedDate) {
      setTimeSlots([])
      return
    }

    const fetchAvailability = async () => {
      setIsLoadingSlots(true)
      try {
        const slots = generateTimeSlots()
        const dateStr = selectedDate + 'T00:00:00'
        const nextDate = addDays(parseISO(selectedDate), 1)
        const nextDateStr = format(nextDate, 'yyyy-MM-dd') + 'T00:00:00'

        const { data: existingAppointments } = await supabase
          .from('appointments')
          .select('appointment_date_time')
          .eq('doctor_id', doctorId)
          .gte('appointment_date_time', dateStr)
          .lt('appointment_date_time', nextDateStr)
          .not('status', 'eq', 'Dibatalkan')

        const bookedTimes = new Set(
          (existingAppointments || []).map((appt: any) =>
            format(new Date(appt.appointment_date_time), 'HH:mm')
          )
        )

        const updatedSlots = slots.map((slot) => ({
          ...slot,
          available: !bookedTimes.has(slot.time),
        }))

        setTimeSlots(updatedSlots)
      } catch (error) {
        console.error('Load time slots error:', error)
        setTimeSlots(generateTimeSlots())
      } finally {
        setIsLoadingSlots(false)
      }
    }

    fetchAvailability()
  }, [doctorId, selectedDate])

  if (!selectedDate) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Pilih Waktu
          </CardTitle>
          <CardDescription>
            Pilih tanggal terlebih dahulu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Silakan pilih tanggal terlebih dahulu</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!doctorId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Pilih Waktu
          </CardTitle>
          <CardDescription>
            Pilih dokter terlebih dahulu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Silakan pilih dokter terlebih dahulu</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5" />
          Pilih Waktu
        </CardTitle>
        <CardDescription>
          {format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: id })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSlots ? (
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada waktu tersedia</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = value === slot.time
                const isAvailable = slot.available

                return (
                  <Button
                    key={slot.time}
                    variant={isSelected ? 'default' : 'outline'}
                    disabled={!isAvailable}
                    onClick={() => onChange(slot.time)}
                    className={`${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : isAvailable
                        ? 'hover:border-blue-300 hover:text-blue-600'
                        : 'opacity-50'
                    }`}
                  >
                    {slot.time}
                  </Button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-600" />
                  <span>Terpilih</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-200" />
                  <span>Tersedia</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gray-100 border" />
                  <span>Booked</span>
                </div>
              </div>
              <p>
                {timeSlots.filter((s) => s.available).length} slot tersedia
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
