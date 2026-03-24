import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Send, MessageSquare, Mail, Smartphone, User, Users, FileText } from 'lucide-react'

interface MessageTemplate {
  id: string
  type: string
  channel: string
  subject: string | null
  body: string
  variables: string[]
}

interface Patient {
  id: string
  full_name: string
  phone_number: string
  email: string | null
  preferred_channel: string
}

interface MessageComposerProps {
  initialPatientId?: string
  initialAppointmentId?: string
  defaultChannel?: 'whatsapp' | 'sms' | 'email'
  onMessageSent?: () => void
  className?: string
}

export function MessageComposer({
  initialPatientId,
  initialAppointmentId,
  defaultChannel = 'whatsapp',
  onMessageSent,
  className = '',
}: MessageComposerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '')
  const [selectedAppointmentId] = useState(initialAppointmentId || '')
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>(defaultChannel)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [message, setMessage] = useState(''  )
  const [subject, setSubject] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [recipientType, setRecipientType] = useState<'single' | 'bulk'>('single')
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ['patients', 'for-message'],
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, phone_number, email, preferred_channel')
        .order('full_name')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['templates', 'for-message', channel],
    queryFn: async (): Promise<MessageTemplate[]> => {
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('channel', channel)
        .eq('is_active', true)
        .order('type')

      if (error) throw error
      return data || []
    },
    enabled: !!channel,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch appointment details if selected
  const { data: appointment } = useQuery({
    queryKey: ['appointments', selectedAppointmentId],
    queryFn: async () => {
      if (!selectedAppointmentId) return null

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patient_id(full_name, phone_number, email),
          doctors:doctor_id(full_name)
        `)
        .eq('id', selectedAppointmentId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!selectedAppointmentId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch selected patient details
  const selectedPatient = patients?.find((p) => p.id === selectedPatientId)

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const template = templates?.find((t) => t.id === templateId)
    if (template) {
      setSubject(template.subject || '')

      // Replace variables with actual values
      let body = template.body
      if (selectedPatient) {
        body = body.replace(/\{\{patient_name\}\}/g, selectedPatient.full_name)
      }
      if (appointment) {
        body = body.replace(/\{\{appointment_date\}\}/g, appointment.appointment_date_time)
        body = body.replace(/\{\{doctor_name\}\}/g, appointment.doctors?.full_name || 'Dokter')
      }
      setMessage(body)
    }
  }

  // Get recipient
  const getRecipient = (patientId: string) => {
    const patient = patients?.find((p) => p.id === patientId)
    if (!patient) return null
    return channel === 'email' ? patient.email : patient.phone_number
  }

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      const results = []

      if (recipientType === 'single' && selectedPatientId) {
        const recipient = getRecipient(selectedPatientId)
        if (!recipient) throw new Error('No recipient contact')

        const { data, error } = await supabase
          .from('communication_log')
          .insert({
            patient_id: selectedPatientId,
            appointment_id: selectedAppointmentId || null,
            channel,
            template_id: selectedTemplateId || null,
            recipient,
            subject: channel === 'email' ? subject : null,
            message,
            status: 'pending',
          })
          .select()
          .single()

        if (error) throw error
        results.push(data)
      } else if (recipientType === 'bulk' && selectedPatientIds.length > 0) {
        for (const patientId of selectedPatientIds) {
          const recipient = getRecipient(patientId)
          if (!recipient) continue

          const { data, error } = await supabase
            .from('communication_log')
            .insert({
              patient_id: patientId,
              appointment_id: selectedAppointmentId || null,
              channel,
              template_id: selectedTemplateId || null,
              recipient,
              subject: channel === 'email' ? subject : null,
              message,
              status: 'pending',
            })
            .select()
            .single()

          if (!error) {
            results.push(data)
          }
        }
      }

      return results
    },
    onSuccess: (data) => {
      const count = data.length
      toast({
        title: 'Pesan Ditambahkan ke Antrian',
        description: `${count} pesan telah ditambahkan ke antrian pengiriman.`,
      })
      queryClient.invalidateQueries({ queryKey: ['communication-log'] })

      // Reset form
      setSelectedTemplateId('')
      setMessage('')
      setSubject('')

      onMessageSent?.()
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menambahkan Pesan',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSend = () => {
    if (!message.trim()) {
      toast({
        title: 'Pesan Kosong',
        description: 'Harap tulis pesan terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }

    if (recipientType === 'single' && !selectedPatientId) {
      toast({
        title: 'Pilih Pasien',
        description: 'Harap pilih pasien terlebih dahulu.',
        variant: 'destructive',
      })
      return
    }

    if (recipientType === 'bulk' && selectedPatientIds.length === 0) {
      toast({
        title: 'Pilih Pasien',
        description: 'Harap pilih minimal satu pasien.',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    sendMessage.mutate()
    setIsSending(false)
  }

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatientIds((prev) =>
      prev.includes(patientId)
        ? prev.filter((id) => id !== patientId)
        : [...prev, patientId]
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Komposer Pesan
        </CardTitle>
        <CardDescription>
          Kirim pesan individual atau massal ke pasien
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={channel} onValueChange={(v) => setChannel(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1">
              <Smartphone className="w-4 h-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value={channel} className="space-y-4 pt-4">
            {/* Recipient Selection */}
            <div className="space-y-2">
              <Label>Jenis Penerima</Label>
              <div className="flex gap-4">
                <Button
                  variant={recipientType === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipientType('single')}
                  className="gap-1"
                >
                  <User className="w-4 h-4" />
                  Pasien Tunggal
                </Button>
                <Button
                  variant={recipientType === 'bulk' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecipientType('bulk')}
                  className="gap-1"
                >
                  <Users className="w-4 h-4" />
                  Banyak Pasien
                </Button>
              </div>
            </div>

            {/* Single Patient Selection */}
            {recipientType === 'single' && (
              <div className="space-y-2">
                <Label>Pilih Pasien</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cari pasien..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        <div className="flex items-center gap-2">
                          <span>{patient.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {patient.preferred_channel}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <p className="text-sm text-gray-500">
                    {channel === 'email' ? selectedPatient.email : selectedPatient.phone_number}
                  </p>
                )}
              </div>
            )}

            {/* Bulk Patient Selection */}
            {recipientType === 'bulk' && (
              <div className="space-y-2">
                <Label>Pilih Pasien ({selectedPatientIds.length} dipilih)</Label>
                <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                  {patients?.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => togglePatientSelection(patient.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPatientIds.includes(patient.id)}
                        onChange={() => togglePatientSelection(patient.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{patient.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Pilih Template (Opsional)</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.type}
                        </Badge>
                        <span>{template.subject || template.body.substring(0, 30) + '...'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Subject (only for email) */}
            {channel === 'email' && (
              <div className="space-y-2">
                <Label>Subjek Email</Label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Masukkan subjek email..."
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-2">
              <Label>Pesan</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis pesan Anda di sini..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-gray-500">
                Variabel: {'{{patient_name}}'}, {'{{appointment_date}}'}, {'{{doctor_name}}'}, {'{{service_name}}'}
              </p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Pesan
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}