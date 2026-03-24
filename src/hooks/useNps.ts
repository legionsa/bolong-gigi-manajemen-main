import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface NpsResponse {
  id: string
  patient_id: string
  appointment_id: string | null
  score: number
  feedback: string | null
  follow_up_requested: boolean
  submitted_at: string
}

export interface NpsSubmission {
  patient_id: string
  appointment_id?: string
  score: number
  feedback?: string
  follow_up_requested?: boolean
}

/**
 * Hook to fetch NPS responses for a specific patient
 */
export function usePatientNpsResponses(patientId: string | undefined) {
  return useQuery({
    queryKey: ['nps-responses', 'patient', patientId],
    queryFn: async (): Promise<NpsResponse[]> => {
      if (!patientId) return []

      const { data, error } = await supabase
        .from('nps_responses')
        .select('*')
        .eq('patient_id', patientId)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch NPS responses for a specific appointment
 */
export function useAppointmentNps(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['nps-responses', 'appointment', appointmentId],
    queryFn: async (): Promise<NpsResponse | null> => {
      if (!appointmentId) return null

      const { data, error } = await supabase
        .from('nps_responses')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to submit an NPS survey response
 */
export function useSubmitNps() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submission: NpsSubmission) => {
      const { data, error } = await supabase
        .from('nps_responses')
        .insert({
          patient_id: submission.patient_id,
          appointment_id: submission.appointment_id || null,
          score: submission.score,
          feedback: submission.feedback || null,
          follow_up_requested: submission.follow_up_requested || false,
        })
        .select()
        .single()

      if (error) throw error

      // If appointment_id provided, mark the appointment as NPS responded
      if (submission.appointment_id) {
        await supabase
          .from('appointments')
          .update({ nps_responded: true })
          .eq('id', submission.appointment_id)
      }

      return data
    },
    onSuccess: () => {
      toast({
        title: 'Terima Kasih!',
        description: 'Masukan Anda sangat berarti untuk meningkatkan layanan kami.',
      })
      queryClient.invalidateQueries({ queryKey: ['nps-responses'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mengirim Survei',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to fetch NPS statistics (admin/staff only)
 */
export function useNpsStats() {
  return useQuery({
    queryKey: ['nps-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('score')

      if (error) throw error

      const responses = data || []
      const totalResponses = responses.length

      if (totalResponses === 0) {
        return {
          totalResponses: 0,
          averageScore: 0,
          promoters: 0,
          passives: 0,
          detractors: 0,
          promoterPercentage: 0,
          npsScore: 0,
        }
      }

      const averageScore = responses.reduce((sum, r) => sum + r.score, 0) / totalResponses

      const promoters = responses.filter((r) => r.score >= 9).length
      const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length
      const detractors = responses.filter((r) => r.score <= 6).length

      const promoterPercentage = (promoters / totalResponses) * 100
      const detractorPercentage = (detractors / totalResponses) * 100
      const npsScore = promoterPercentage - detractorPercentage

      return {
        totalResponses,
        averageScore,
        promoters,
        passives,
        detractors,
        promoterPercentage,
        npsScore,
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch recent NPS responses for dashboard (admin/staff only)
 */
export function useRecentNpsResponses(limit: number = 10) {
  return useQuery({
    queryKey: ['nps-responses', 'recent', limit],
    queryFn: async (): Promise<NpsResponse[]> => {
      const { data, error } = await supabase
        .from('nps_responses')
        .select(`
          *,
          patients:patient_id (full_name, phone_number)
        `)
        .order('submitted_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to check if NPS was already sent/responded for an appointment
 */
export function useNpsStatus(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['nps-status', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return { sent: false, responded: false }

      const { data, error } = await supabase
        .from('appointments')
        .select('nps_sent, nps_responded')
        .eq('id', appointmentId)
        .single()

      if (error) throw error

      return {
        sent: data?.nps_sent || false,
        responded: data?.nps_responded || false,
      }
    },
    enabled: !!appointmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to mark NPS as sent for an appointment
 */
export function useMarkNpsSent() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ nps_sent: true })
        .eq('id', appointmentId)

      if (error) throw error
      return { appointmentId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nps-status'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}