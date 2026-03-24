import { useState } from 'react'
import { format, addHours, differenceInHours } from 'date-fns'
import { id } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Clock, MessageSquare, Mail, Smartphone, CheckCircle, XCircle } from 'lucide-react'

interface ReminderSchedulerProps {
  appointmentId: string
  appointmentDateTime: string
  patientId: string
  patientName: string
  doctorName: string
  serviceName: string
  currentReminderStatus?: string
  className?: string
}

interface ReminderSchedule {
  id: string
  label: string
  hoursBefore: number
  channel: 'whatsapp' | 'sms' | 'email'
  icon: React.ReactNode
  color: string
}

const reminderSchedules: ReminderSchedule[] = [
  {
    id: '48h',
    label: '48 jam sebelumnya',
    hoursBefore: 48,
    channel: 'whatsapp',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800',
  },
  {
    id: '24h',
    label: '24 jam sebelumnya',
    hoursBefore: 24,
    channel: 'whatsapp',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: '2h',
    label: '2 jam sebelumnya',
    hoursBefore: 2,
    channel: 'sms',
    icon: <Smartphone className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
  },
]

export function ReminderScheduler({
  appointmentId,
  appointmentDateTime,
  patientId,
  patientName,
  doctorName,
  serviceName,
  currentReminderStatus = 'pending',
  className = '',
}: ReminderSchedulerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedReminders, setSelectedReminders] = useState<string[]>(['48h', '24h', '2h'])
  const [isScheduling, setIsScheduling] = useState(false)

  const appointmentDate = new Date(appointmentDateTime)
  const now = new Date()
  const hoursUntilAppointment = differenceInHours(appointmentDate, now)

  // Fetch existing reminder logs
  const { data: reminderLogs, isLoading } = useQuery({
    queryKey: ['appointment-reminders', appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_log')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!appointmentId,
    staleTime: 2 * 60 * 1000,
  })

  const isReminderSent = (scheduleId: string) => {
    const schedule = reminderSchedules.find((s) => s.id === scheduleId)
    if (!schedule) return false

    return reminderLogs?.some(
      (log) =>
        log.channel === schedule.channel &&
        log.status === 'sent' &&
        log.appointment_id === appointmentId
    )
  }

  const getReminderStatus = (scheduleId: string) => {
    if (isReminderSent(scheduleId)) return 'sent'
    if (!selectedReminders.includes(scheduleId)) return 'skipped'
    return 'pending'
  }

  const toggleReminder = (scheduleId: string) => {
    setSelectedReminders((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    )
  }

  const handleScheduleReminders = async () => {
    setIsScheduling(true)
    try {
      for (const scheduleId of selectedReminders) {
        const schedule = reminderSchedules.find((s) => s.id === scheduleId)
        if (!schedule) continue

        const scheduledFor = addHours(appointmentDate, -schedule.hoursBefore)

        // Only create future reminders
        if (scheduledFor <= now) continue

        // Insert into follow_up_log
        await supabase.from('follow_up_log').insert({
          patient_id: patientId,
          appointment_id: appointmentId,
          follow_up_type: 'reminder',
          channel: schedule.channel,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString(),
        })

        // Also update appointment reminder status
        await supabase
          .from('appointments')
          .update({
            reminder_status: 'scheduled',
            [`${schedule.channel}_reminder_sent`]: false,
          })
          .eq('id', appointmentId)
      }

      toast({
        title: 'Pengingat Dijadwalkan',
        description: `${selectedReminders.length} pengingat telah dijadwalkan untuk appointment ini.`,
      })

      queryClient.invalidateQueries({ queryKey: ['appointment-reminders'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    } catch (error: any) {
      toast({
        title: 'Gagal Menjadwalkan',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const handleSendNow = async (scheduleId: string) => {
    setIsScheduling(true)
    try {
      const schedule = reminderSchedules.find((s) => s.id === scheduleId)
      if (!schedule) return

      // Get patient contact
      const { data: patient } = await supabase
        .from('patients')
        .select('phone_number, email')
        .eq('id', patientId)
        .single()

      if (!patient) throw new Error('Patient not found')

      const recipient = schedule.channel === 'email' ? patient.email : patient.phone_number
      if (!recipient) throw new Error(`No ${schedule.channel} contact`)

      // Get template
      const { data: template } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('type', 'reminder')
        .eq('channel', schedule.channel)
        .eq('is_active', true)
        .single()

      // Personalize message
      let message = template?.body || `Reminder: Appointment on ${format(appointmentDate, 'PPP', { locale: id })}`
      message = message
        .replace('{{patient_name}}', patientName)
        .replace('{{appointment_date}}', format(appointmentDate, 'dd MMMM yyyy', { locale: id }))
        .replace('{{appointment_time}}', format(appointmentDate, 'HH:mm'))
        .replace('{{doctor_name}}', doctorName)
        .replace('{{service_name}}', serviceName)

      // Insert into communication_log
      await supabase.from('communication_log').insert({
        patient_id: patientId,
        appointment_id: appointmentId,
        channel: schedule.channel,
        template_id: template?.id || null,
        recipient,
        message,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })

      // Update appointment
      await supabase
        .from('appointments')
        .update({
          [`${schedule.channel}_reminder_sent`]: true,
          reminder_status: `sent_${schedule.id}`,
        })
        .eq('id', appointmentId)

      toast({
        title: 'Pengingat Terkirim',
        description: `Pengingat ${schedule.label} telah dikirim via ${schedule.channel}.`,
      })

      queryClient.invalidateQueries({ queryKey: ['appointment-reminders'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    } catch (error: any) {
      toast({
        title: 'Gagal Mengirim',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const formatScheduledTime = (scheduleId: string) => {
    const schedule = reminderSchedules.find((s) => s.id === scheduleId)
    if (!schedule) return ''
    const scheduledFor = addHours(appointmentDate, -schedule.hoursBefore)
    return format(scheduledFor, "dd MMM yyyy, HH:mm")
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pengingat Appointment
        </CardTitle>
        <CardDescription>
          Jadwalkan pengingat otomatis untuk pasien
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {reminderSchedules.map((schedule) => {
                const status = getReminderStatus(schedule.id)
                const isPast = hoursUntilAppointment < schedule.hoursBefore
                const isSent = status === 'sent'

                return (
                  <div
                    key={schedule.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isSent
                        ? 'bg-green-50 border-green-200'
                        : isPast
                        ? 'bg-gray-50 border-gray-200 opacity-50'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={schedule.id}
                        checked={selectedReminders.includes(schedule.id)}
                        onCheckedChange={() => toggleReminder(schedule.id)}
                        disabled={isSent || isPast || isScheduling}
                      />
                      <div>
                        <Label
                          htmlFor={schedule.id}
                          className={`font-medium flex items-center gap-2 ${isSent ? 'text-green-700' : ''}`}
                        >
                          {schedule.icon}
                          {schedule.label}
                        </Label>
                        <p className="text-xs text-gray-500">
                          {isSent
                            ? `Terkirim`
                            : isPast
                            ? 'Waktu sudah lewat'
                            : `Direncanakan: ${formatScheduledTime(schedule.id)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSent ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Terkirim
                        </Badge>
                      ) : isPast ? (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Lewat
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className={schedule.color}>
                            {schedule.channel === 'whatsapp' ? (
                              <MessageSquare className="w-3 h-3 mr-1" />
                            ) : schedule.channel === 'email' ? (
                              <Mail className="w-3 h-3 mr-1" />
                            ) : (
                              <Smartphone className="w-3 h-3 mr-1" />
                            )}
                            {schedule.channel}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendNow(schedule.id)}
                            disabled={isScheduling}
                          >
                            {isScheduling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Kirim Sekarang'
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={handleScheduleReminders}
                disabled={isScheduling || selectedReminders.length === 0}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Jadwalkan {selectedReminders.length} Pengingat
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}