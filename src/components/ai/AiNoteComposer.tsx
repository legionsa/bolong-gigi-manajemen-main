import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Check, X, Edit2, Sparkles, FileText, Stethoscope, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IcdCode {
  code: string
  label: string
  confidence: number
}

interface AiNoteDraft {
  id: string
  appointment_id: string
  patient_id: string
  raw_transcription: string | null
  generated_note: string
  icd10_codes: IcdCode[]
  icd9_codes: IcdCode[]
  confidence_score: number | null
  status: 'draft' | 'approved' | 'rejected' | 'needs_revision'
  rejected_reason: string | null
  created_at: string
  updated_at: string
}

interface AiNoteComposerProps {
  draft: AiNoteDraft
  onApprove: (draftId: string, editedNote?: string) => Promise<void>
  onReject: (draftId: string, reason: string) => Promise<void>
  onRequestRevision: (draftId: string, feedback: string) => Promise<void>
  onEdit: (draftId: string, editedNote: string) => Promise<void>
  isLoading?: boolean
}

export function AiNoteComposer({
  draft,
  onApprove,
  onReject,
  onRequestRevision,
  onEdit,
  isLoading = false,
}: AiNoteComposerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedNote, setEditedNote] = useState(draft.generated_note)
  const [rejectReason, setRejectReason] = useState('')
  const [revisionFeedback, setRevisionFeedback] = useState('')

  const confidenceScore = draft.confidence_score ? Number(draft.confidence_score) : 0

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-100'
    if (score >= 0.6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const handleSaveEdit = async () => {
    await onEdit(draft.id, editedNote)
    setIsEditing(false)
  }

  const parseSoapNote = (note: string) => {
    const sections = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    }

    const lines = note.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (/^S\s*[-:]\s*/i.test(trimmedLine)) {
        currentSection = 'subjective'
        sections.subjective = trimmedLine.replace(/^S\s*[-:]\s*/i, '')
      } else if (/^O\s*[-:]\s*/i.test(trimmedLine)) {
        currentSection = 'objective'
        sections.objective = trimmedLine.replace(/^O\s*[-:]\s*/i, '')
      } else if (/^A\s*[-:]\s*/i.test(trimmedLine)) {
        currentSection = 'assessment'
        sections.assessment = trimmedLine.replace(/^A\s*[-:]\s*/i, '')
      } else if (/^P\s*[-:]\s*/i.test(trimmedLine)) {
        currentSection = 'plan'
        sections.plan = trimmedLine.replace(/^P\s*[-:]\s*/i, '')
      } else if (currentSection) {
        sections[currentSection] += '\n' + trimmedLine
      }
    }

    return sections
  }

  const soapSections = parseSoapNote(draft.generated_note)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>Catatan SOAP AI</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'px-3 py-1',
              draft.status === 'draft' && 'bg-blue-100 text-blue-700',
              draft.status === 'approved' && 'bg-green-100 text-green-700',
              draft.status === 'rejected' && 'bg-red-100 text-red-700',
              draft.status === 'needs_revision' && 'bg-yellow-100 text-yellow-700'
            )}
          >
            {draft.status === 'draft' && 'Draft'}
            {draft.status === 'approved' && 'Disetujui'}
            {draft.status === 'rejected' && 'Ditolak'}
            {draft.status === 'needs_revision' && 'Revisi'}
          </Badge>
        </div>
        <CardDescription>
          Dibuat pada {new Date(draft.created_at).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Tingkat Kepercayaan AI</Label>
            <span className={cn('text-sm font-semibold', getConfidenceColor(confidenceScore))}>
              {Math.round(confidenceScore * 100)}%
            </span>
          </div>
          <div className={cn('rounded-full h-2 overflow-hidden', getConfidenceBg(confidenceScore))}>
            <Progress value={confidenceScore * 100} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground">
            Confidence score berdasarkan kompleksitas diagnosa dan kejelasan transkrip
          </p>
        </div>

        <Separator />

        {/* ICD Codes */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Kode ICD yang Disarankan</Label>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              ICD-10 (Diagnosa)
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.icd10_codes && draft.icd10_codes.length > 0 ? (
                draft.icd10_codes.map((icd, idx) => (
                  <Badge
                    key={`icd10-${idx}`}
                    variant="outline"
                    className="px-2 py-1 bg-blue-50 border-blue-200"
                  >
                    <span className="font-mono text-xs mr-1">{icd.code}</span>
                    <span className="text-xs">- {icd.label}</span>
                    {icd.confidence && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({Math.round(icd.confidence * 100)}%)
                      </span>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Tidak ada kode ICD-10</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              ICD-9-CM (Prosedur)
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.icd9_codes && draft.icd9_codes.length > 0 ? (
                draft.icd9_codes.map((icd, idx) => (
                  <Badge
                    key={`icd9-${idx}`}
                    variant="outline"
                    className="px-2 py-1 bg-green-50 border-green-200"
                  >
                    <span className="font-mono text-xs mr-1">{icd.code}</span>
                    <span className="text-xs">- {icd.label}</span>
                    {icd.confidence && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({Math.round(icd.confidence * 100)}%)
                      </span>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Tidak ada kode ICD-9</span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* SOAP Note Content */}
        {draft.status === 'draft' && isEditing ? (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Edit Catatan SOAP</Label>
            <Textarea
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Edit catatan SOAP..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                Simpan Perubahan
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="formatted" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatted">
                <FileText className="h-4 w-4 mr-2" />
                Terformat
              </TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="formatted" className="mt-4">
              <div className="space-y-4">
                {soapSections.subjective && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-700 mb-1">S - Subjektive</h4>
                    <p className="text-sm whitespace-pre-wrap">{soapSections.subjective}</p>
                  </div>
                )}
                {soapSections.objective && (
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <h4 className="font-semibold text-green-700 mb-1">O - Objektif</h4>
                    <p className="text-sm whitespace-pre-wrap">{soapSections.objective}</p>
                  </div>
                )}
                {soapSections.assessment && (
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    <h4 className="font-semibold text-yellow-700 mb-1">A - Assessment</h4>
                    <p className="text-sm whitespace-pre-wrap">{soapSections.assessment}</p>
                  </div>
                )}
                {soapSections.plan && (
                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                    <h4 className="font-semibold text-purple-700 mb-1">P - Plan</h4>
                    <p className="text-sm whitespace-pre-wrap">{soapSections.plan}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">{draft.generated_note}</pre>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Raw Transcription */}
        {draft.raw_transcription && (
          <>
            <Separator />
            <details className="group">
              <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                Lihat Transkrip Asli
              </summary>
              <div className="mt-2 bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap italic text-muted-foreground">
                  {draft.raw_transcription}
                </p>
              </div>
            </details>
          </>
        )}

        {/* Action Buttons - only for draft status */}
        {draft.status === 'draft' && !isEditing && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                    <X className="h-4 w-4 mr-2" />
                    Minta Revisi
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Minta Revisi</AlertDialogTitle>
                    <AlertDialogDescription>
                      Berikan feedback untuk perbaikan catatan AI ini.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="Feedback perbaikan..."
                    className="min-h-[100px]"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onRequestRevision(draft.id, revisionFeedback)}
                      disabled={isLoading || !revisionFeedback.trim()}
                    >
                      Kirim Feedback
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <X className="h-4 w-4 mr-2" />
                    Tolak
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tolak Catatan AI</AlertDialogTitle>
                    <AlertDialogDescription>
                      Berikan alasan penolakan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Alasan penolakan..."
                    className="min-h-[100px]"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onReject(draft.id, rejectReason)}
                      disabled={isLoading || !rejectReason.trim()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Tolak
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={() => onApprove(draft.id, editedNote)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Setujui
              </Button>
            </div>
          </>
        )}

        {/* Rejection reason display */}
        {draft.status === 'rejected' && draft.rejected_reason && (
          <>
            <Separator />
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-700 mb-1">Alasan Penolakan</h4>
              <p className="text-sm text-red-600">{draft.rejected_reason}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}