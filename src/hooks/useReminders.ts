import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface ReminderLog {
  id: string
  patient_id: string
  appointment_id: string
  channel: 'whatsapp' | 'sms' | 'email'
  template_id: string | null
  recipient: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'opt_out' | 'clicked'
  external_id: string | null
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface SendReminderOptions {
  appointmentId: string
  patientId: string
  channel: 'email' | 'whatsapp' | 'sms'
  reminderType: '48h' | '24h' | '2h'
}

/**
 * Hook to fetch communication logs for a specific patient
 */
export function usePatientReminders(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-reminders', patientId],
    queryFn: async (): Promise<ReminderLog[]> => {
      if (!patientId) return []

      const { data, error } = await supabase
        .from('communication_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch communication logs for a specific appointment
 */
export function useAppointmentReminders(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['appointment-reminders', appointmentId],
    queryFn: async (): Promise<ReminderLog[]> => {
      if (!appointmentId) return []

      const { data, error } = await supabase
        .from('communication_log')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to send a reminder manually
 */
export function useSendReminder() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: SendReminderOptions) => {
      const { appointmentId, patientId, channel, reminderType } = options

      // Call the Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${localStorage.getItem('supabase-token') || ''}`,
        },
        body: JSON.stringify({
          appointmentId,
          patientId,
          channel,
          reminderType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send reminder')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: 'Pengingat Terkirim',
        description: `Pengingat berhasil dikirim via ${data.channel}`,
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['appointment-reminders'] })
      queryClient.invalidateQueries({ queryKey: ['patient-reminders'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mengirim Pengingat',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to schedule a reminder for an appointment
 * Note: In production, this would be handled by pg_cron on the backend
 */
export function useScheduleReminder() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (options: {
      appointmentId: string
      scheduledFor: Date
      channel: 'email' | 'whatsapp' | 'sms'
    }) => {
      const { appointmentId, scheduledFor, channel } = options

      // Update appointment with scheduled reminder info
      const { error } = await supabase
        .from('appointments')
        .update({
          reminder_status: 'scheduled',
          reminder_scheduled_at: scheduledFor.toISOString(),
        })
        .eq('id', appointmentId)

      if (error) throw error

      return { appointmentId, scheduledFor, channel }
    },
    onSuccess: () => {
      toast({
        title: 'Pengingat Dijadwalkan',
        description: 'Pengingat akan dikirim sesuai jadwal',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menjadwalkan',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to get recall-eligible patients (overdue for checkup)
 */
export function useRecallPatients(monthsThreshold: 6 | 12 = 6) {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsThreshold)

  return useQuery({
    queryKey: ['recall-patients', monthsThreshold],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          last_visit_date,
          recall_status
        `)
        .or(`last_visit_date.lt.${cutoffDate.toISOString().split('T')[0]},last_visit_date.is.null`)
        .eq('recall_status', 'active')
        .order('last_visit_date', { ascending: true, nullsFirst: false })

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to send bulk recall messages
 */
export function useSendBulkRecall() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: {
      patientIds: string[]
      channel: 'email' | 'whatsapp' | 'sms'
      message: string
    }) => {
      const results = []

      for (const patientId of options.patientIds) {
        // Get patient details
        const { data: patient } = await supabase
          .from('patients')
          .select('id, email, phone_number')
          .eq('id', patientId)
          .single()

        if (!patient) continue

        const recipient = options.channel === 'email' ? patient.email : patient.phone_number
        if (!recipient) continue

        // Log the message
        const { data, error } = await supabase
          .from('communication_log')
          .insert({
            patient_id: patientId,
            channel: options.channel,
            recipient,
            message: options.message,
            status: 'pending',
          })
          .select()
          .single()

        if (!error) {
          results.push(data)
        }
      }

      return results
    },
    onSuccess: (data) => {
      toast({
        title: 'Pesan Bulk Terkirim',
        description: `${data.length} pesan telah dijadwalkan`,
      })
      queryClient.invalidateQueries({ queryKey: ['recall-patients'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mengirim Pesan',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
