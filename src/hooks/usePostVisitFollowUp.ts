import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface FollowUpConfig {
  id: string
  type: 'nps' | 'care_instructions' | 'recall'
  trigger: 'after_completion' | 'after_24h' | 'after_48h' | 'manual'
  channel: 'whatsapp' | 'sms' | 'email'
  template_id: string | null
  is_active: boolean
  delay_hours: number | null
}

export interface FollowUpLog {
  id: string
  patient_id: string
  appointment_id: string | null
  follow_up_type: 'nps' | 'care_instructions' | 'recall'
  channel: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  scheduled_for: string | null
  sent_at: string | null
  error_message: string | null
  created_at: string
}

/**
 * Hook to get follow-up configuration
 */
export function useFollowUpConfig() {
  return useQuery({
    queryKey: ['follow-up-config'],
    queryFn: async (): Promise<FollowUpConfig[]> => {
      const { data, error } = await supabase
        .from('follow_up_config')
        .select('*')
        .eq('is_active', true)
        .order('trigger')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get follow-up logs for a patient
 */
export function usePatientFollowUps(patientId: string | undefined) {
  return useQuery({
    queryKey: ['follow-ups', 'patient', patientId],
    queryFn: async (): Promise<FollowUpLog[]> => {
      if (!patientId) return []

      const { data, error } = await supabase
        .from('follow_up_log')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to get follow-up logs for an appointment
 */
export function useAppointmentFollowUps(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['follow-ups', 'appointment', appointmentId],
    queryFn: async (): Promise<FollowUpLog[]> => {
      if (!appointmentId) return []

      const { data, error } = await supabase
        .from('follow_up_log')
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
 * Hook to trigger post-visit follow-ups for a completed appointment
 * This is called when an appointment status changes to 'Selesai'
 */
export function useTriggerPostVisitFollowUp() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: {
      appointmentId: string
      patientId: string
      serviceName?: string
      doctorName?: string
    }) => {
      const { appointmentId, patientId, serviceName, doctorName } = options

      // Get patient details
      const { data: patient } = await supabase
        .from('patients')
        .select('full_name, phone_number, email, preferred_channel')
        .eq('id', patientId)
        .single()

      if (!patient) {
        throw new Error('Patient not found')
      }

      // Get appointment details
      const { data: appointment } = await supabase
        .from('appointments')
        .select('appointment_date_time')
        .eq('id', appointmentId)
        .single()

      if (!appointment) {
        throw new Error('Appointment not found')
      }

      const results = []

      // 1. Send NPS Survey (24h after completion)
      const npsTemplate = await supabase
        .from('communication_templates')
        .select('*')
        .eq('type', 'nps')
        .eq('channel', patient.preferred_channel || 'whatsapp')
        .eq('is_active', true)
        .single()

      if (npsTemplate.data) {
        const scheduledFor = new Date(appointment.appointment_date_time)
        scheduledFor.setHours(scheduledFor.getHours() + 24)

        const { data: npsLog, error: npsError } = await supabase
          .from('follow_up_log')
          .insert({
            patient_id: patientId,
            appointment_id: appointmentId,
            follow_up_type: 'nps',
            channel: patient.preferred_channel || 'whatsapp',
            status: 'pending',
            scheduled_for: scheduledFor.toISOString(),
          })
          .select()
          .single()

        if (!npsError) {
          // Log to communication_log
          await supabase.from('communication_log').insert({
            patient_id: patientId,
            appointment_id: appointmentId,
            channel: patient.preferred_channel || 'whatsapp',
            template_id: npsTemplate.data.id,
            recipient: patient.preferred_channel === 'email' ? patient.email : patient.phone_number,
            message: npsTemplate.data.body,
            status: 'pending',
          })
        }

        results.push({ type: 'nps', status: npsError ? 'failed' : 'scheduled', log: npsLog })
      }

      // 2. Send Care Instructions (immediately after completion)
      const careTemplate = await supabase
        .from('communication_templates')
        .select('*')
        .eq('type', 'care_instructions')
        .eq('channel', patient.preferred_channel || 'whatsapp')
        .eq('is_active', true)
        .single()

      if (careTemplate.data && serviceName) {
        // Replace care_instructions placeholder
        let careContent = 'Ikuti instruksi dokter gigi Anda.'
        if (serviceName.toLowerCase().includes('scaling')) {
          careContent = 'Setelah scaling, hindari makanan dan minuman yang terlalu panas atau dingin selama 24 jam. Gigi mungkin terasa sensitif, ini normal dan akan membaik dalam beberapa hari.'
        } else if (serviceName.toLowerCase().includes('tambal') || serviceName.toLowerCase().includes('filling')) {
          careContent = 'Setelah penambalan, hindari makan keras selama 2 jam. Gigi yang ditambal mungkin terasa ngilu敏感 selama beberapa hari.'
        } else if (serviceName.toLowerCase().includes('ekstrak') || serviceName.toLowerCase().includes('cabut')) {
          careContent = 'Setelah pencabutan, gigit perban selama 30 menit. Jangan berkumur keras. Hindari makanan panas dan merokok selama 24 jam.'
        }

        const personalizedBody = careTemplate.data.body.replace(
          '{{care_instructions}}',
          careContent
        )

        const { data: careLog, error: careError } = await supabase
          .from('follow_up_log')
          .insert({
            patient_id: patientId,
            appointment_id: appointmentId,
            follow_up_type: 'care_instructions',
            channel: patient.preferred_channel || 'whatsapp',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
          })
          .select()
          .single()

        if (!careError) {
          await supabase.from('communication_log').insert({
            patient_id: patientId,
            appointment_id: appointmentId,
            channel: patient.preferred_channel || 'whatsapp',
            template_id: careTemplate.data.id,
            recipient: patient.preferred_channel === 'email' ? patient.email : patient.phone_number,
            message: personalizedBody,
            status: 'pending',
          })
        }

        results.push({ type: 'care_instructions', status: careError ? 'failed' : 'scheduled', log: careLog })
      }

      return { appointmentId, results }
    },
    onSuccess: (data) => {
      const scheduled = data.results.filter((r: any) => r.status === 'scheduled').length
      const failed = data.results.filter((r: any) => r.status === 'failed').length

      if (scheduled > 0) {
        toast({
          title: 'Follow-Up Dijadwalkan',
          description: `${scheduled} pesan follow-up telah dijadwalkan${failed > 0 ? `, ${failed} gagal` : ''}`,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['communication-log'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menjalankan Follow-Up',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to send a manual follow-up message
 */
export function useSendManualFollowUp() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: {
      patientId: string
      appointmentId?: string
      type: 'nps' | 'care_instructions' | 'recall'
      channel: 'whatsapp' | 'sms' | 'email'
      customMessage?: string
    }) => {
      const { patientId, appointmentId, type, channel, customMessage } = options

      // Get patient details
      const { data: patient } = await supabase
        .from('patients')
        .select('full_name, phone_number, email')
        .eq('id', patientId)
        .single()

      if (!patient) {
        throw new Error('Patient not found')
      }

      const recipient = channel === 'email' ? patient.email : patient.phone_number
      if (!recipient) {
        throw new Error(`No ${channel} contact for patient`)
      }

      // Get template or use custom message
      let message = customMessage || ''
      let templateId: string | null = null

      if (!customMessage) {
        const { data: template } = await supabase
          .from('communication_templates')
          .select('*')
          .eq('type', type)
          .eq('channel', channel)
          .eq('is_active', true)
          .single()

        if (template) {
          message = template.body
          templateId = template.id
        }
      }

      // Insert into communication_log
      const { data: log, error } = await supabase
        .from('communication_log')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId || null,
          channel,
          template_id: templateId,
          recipient,
          message,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      return log
    },
    onSuccess: () => {
      toast({
        title: 'Pesan Terkirim',
        description: 'Pesan follow-up telah dikirim ke antrian.',
      })
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['communication-log'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mengirim',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to fetch pending follow-ups that need to be sent
 * (for Edge Function or cron job)
 */
export function usePendingFollowUps() {
  return useQuery({
    queryKey: ['follow-ups', 'pending'],
    queryFn: async (): Promise<FollowUpLog[]> => {
      const { data, error } = await supabase
        .from('follow_up_log')
        .select('*, patients:patient_id(full_name, phone_number, email)')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for')

      if (error) throw error
      return data || []
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}