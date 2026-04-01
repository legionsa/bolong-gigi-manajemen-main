import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Star, ThumbsUp, ThumbsDown, Minus, CheckCircle, Loader2 } from 'lucide-react'
import { useSubmitNps } from '@/hooks/useNps'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface NpsSurveyProps {
  patientId: string
  appointmentId?: string
  appointmentDate?: string
  serviceName?: string
  doctorName?: string
  onComplete?: () => void
  className?: string
}

export function NpsSurvey({
  patientId,
  appointmentId,
  appointmentDate,
  serviceName,
  doctorName,
  onComplete,
  className = ''
}: NpsSurveyProps) {
  const { toast } = useToast()
  const submitNps = useSubmitNps()
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [followUpRequested, setFollowUpRequested] = useState(false)
  const [step, setStep] = useState<'rating' | 'feedback' | 'success'>('rating')

  const handleRatingSelect = (selectedScore: number) => {
    setScore(selectedScore)
    setStep('feedback')
  }

  const handleSubmit = async () => {
    if (score === null) return

    try {
      await submitNps.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        score,
        feedback: feedback || undefined,
        follow_up_requested: followUpRequested,
      })
      setStep('success')
      onComplete?.()
    } catch (error) {
      toast({
        title: 'Gagal Mengirim',
        description: 'Terjadi kesalahan saat mengirim survei',
        variant: 'destructive',
      })
    }
  }

  const getScoreLabel = (s: number) => {
    if (s <= 6) return 'Detractor'
    if (s <= 8) return 'Passive'
    return 'Promoter'
  }

  const getScoreColor = (s: number) => {
    if (s <= 6) return 'text-red-500'
    if (s <= 8) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getScoreIcon = (s: number) => {
    if (s <= 6) return <ThumbsDown className="w-4 h-4" />
    if (s <= 8) return <Minus className="w-4 h-4" />
    return <ThumbsUp className="w-4 h-4" />
  }

  if (step === 'success') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Terima Kasih!</h3>
            <p className="text-muted-foreground">
              Masukan Anda sangat berarti untuk meningkatkan kualitas layanan kami.
            </p>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Skor NPS Anda: <span className={getScoreColor(score!)}>{score} ({getScoreLabel(score!)})</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle>Bagaimana Pengalaman Anda?</CardTitle>
        <CardDescription>
          {appointmentDate && (
            <span>
              Appointment: {format(new Date(appointmentDate), 'dd MMMM yyyy', { locale: id })}
              {serviceName && ` - ${serviceName}`}
              {doctorName && ` dengan ${doctorName}`}
            </span>
          )}
          {!appointmentDate && 'Bantu kami meningkatkan layanan kesehatan gigi Anda'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'rating' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Seberapa besar kemungkinan Anda merekomendasikan DentiCare Pro kepada teman atau keluarga?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => handleRatingSelect(s)}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-medium transition-all hover:scale-110 ${
                    score === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Sangat Tidak Mungkin</span>
              <span>Sangat Mungkin</span>
            </div>
          </div>
        )}

        {step === 'feedback' && score !== null && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Skor yang Anda pilih:</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getScoreColor(score)} bg-opacity-10`}>
                {getScoreIcon(score)}
                <span className="font-semibold">{score}</span>
                <span className="text-sm">({getScoreLabel(score)})</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Kritik & Saran (Opsional)</Label>
              <Textarea
                id="feedback"
                placeholder="Ceritakan pengalaman Anda..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="followUp"
                checked={followUpRequested}
                onChange={(e) => setFollowUpRequested(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="followUp" className="text-sm cursor-pointer">
                Saya ingin tim kami menghubungi saya untuk follow-up
              </Label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('rating')} className="flex-1">
                Kembali
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitNps.isPending}
                className="flex-1"
              >
                {submitNps.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kirim
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NpsSurvey
