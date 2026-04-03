
import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicalRecordSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { useDoctors } from '@/hooks/useDoctors';
import { useToast } from '@/hooks/use-toast';
import { Odontogram } from './Odontogram';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X as XIcon, Check as CheckIcon, Sparkles, Mic, History, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { AiNoteComposer } from '@/components/ai/AiNoteComposer';
import { SmartCoding } from '@/components/ai/SmartCoding';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const historyConditionsOptions = ['Diabetic', 'Hypertension', 'Haemophilia', 'Hepatitis', 'Gastric', 'HIV/AIDS'];
const commonDrugAllergies = ['Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa', 'Codeine', 'Amoxicillin'];

interface AiNoteDraft {
  id: string;
  appointment_id: string;
  patient_id: string;
  raw_transcription: string | null;
  generated_note: string;
  icd10_codes: { code: string; label: string; confidence: number }[];
  icd9_codes: { code: string; label: string; confidence: number }[];
  confidence_score: number | null;
  status: 'draft' | 'approved' | 'rejected' | 'needs_revision';
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const MedicalRecordForm = ({ patientId, onSuccess, onCancel }) => {
  const { doctors, isLoading: isLoadingDoctors } = useDoctors();
  const { addMedicalRecord, isAdding } = useMedicalRecords(patientId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AI Note state
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [showAiComposer, setShowAiComposer] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<AiNoteDraft | null>(null);
  const [showAiHistory, setShowAiHistory] = useState(false);

  // Fetch AI note drafts for this patient
  const { data: aiNoteDrafts, isLoading: isLoadingAiDrafts } = useQuery({
    queryKey: ['aiNoteDrafts', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_note_drafts')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AiNoteDraft[];
    },
    enabled: !!patientId,
  });

  // Generate AI note mutation
  const generateAiNoteMutation = useMutation({
    mutationFn: async ({ appointmentId, transcriptionText }: { appointmentId: string; transcriptionText: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-note-generation', {
        body: { appointment_id: appointmentId, transcription: transcriptionText, patient_id: patientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.draft_id) {
        queryClient.invalidateQueries({ queryKey: ['aiNoteDrafts', patientId] });
        setCurrentDraft(data);
        setShowAiComposer(true);
        toast({ title: 'Sukses', description: 'Catatan AI berhasil dibuat.' });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    },
    onError: (error) => {
      toast({ title: 'Gagal', description: `Gagal membuat catatan AI: ${error.message}`, variant: 'destructive' });
    },
  });

  // Approve AI note mutation
  const approveAiNoteMutation = useMutation({
    mutationFn: async ({ draftId, editedNote }: { draftId: string; editedNote?: string }) => {
      const { data, error } = await supabase
        .from('ai_note_drafts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', draftId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiNoteDrafts', patientId] });
      toast({ title: 'Sukses', description: 'Catatan AI berhasil disetujui.' });
      setShowAiComposer(false);
      setCurrentDraft(null);
    },
    onError: (error) => {
      toast({ title: 'Gagal', description: `Gagal menyetujui catatan AI: ${error.message}`, variant: 'destructive' });
    },
  });

  // Reject AI note mutation
  const rejectAiNoteMutation = useMutation({
    mutationFn: async ({ draftId, reason }: { draftId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('ai_note_drafts')
        .update({ status: 'rejected', rejected_reason: reason })
        .eq('id', draftId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiNoteDrafts', patientId] });
      toast({ title: 'Catatan AI Ditolak', description: 'Catatan AI telah ditolak.' });
      setShowAiComposer(false);
      setCurrentDraft(null);
    },
    onError: (error) => {
      toast({ title: 'Gagal', description: `Gagal menolak catatan AI: ${error.message}`, variant: 'destructive' });
    },
  });

  // Request revision mutation
  const requestRevisionMutation = useMutation({
    mutationFn: async ({ draftId, feedback }: { draftId: string; feedback: string }) => {
      const { data, error } = await supabase
        .from('ai_note_drafts')
        .update({ status: 'needs_revision' })
        .eq('id', draftId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiNoteDrafts', patientId] });
      toast({ title: 'Revisi Diminta', description: 'Feedback revisi telah dikirim.' });
      setShowAiComposer(false);
      setCurrentDraft(null);
    },
    onError: (error) => {
      toast({ title: 'Gagal', description: `Gagal meminta revisi: ${error.message}`, variant: 'destructive' });
    },
  });

  // Edit AI note mutation
  const editAiNoteMutation = useMutation({
    mutationFn: async ({ draftId, editedNote }: { draftId: string; editedNote: string }) => {
      const { data, error } = await supabase
        .from('ai_note_drafts')
        .update({ generated_note: editedNote })
        .eq('id', draftId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiNoteDrafts', patientId] });
      toast({ title: 'Berhasil', description: 'Catatan AI berhasil diperbarui.' });
    },
    onError: (error) => {
      toast({ title: 'Gagal', description: `Gagal memperbarui catatan AI: ${error.message}`, variant: 'destructive' });
    },
  });

  const handleGenerateAiNote = async (appointmentId: string) => {
    if (!transcription.trim()) {
      toast({ title: 'Peringatan', description: 'Masukkan transkrip suara terlebih dahulu.', variant: 'destructive' });
      return;
    }
    setIsGeneratingNote(true);
    try {
      await generateAiNoteMutation.mutateAsync({ appointmentId, transcriptionText: transcription });
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handleApproveNote = async (draftId: string, editedNote?: string) => {
    await approveAiNoteMutation.mutateAsync({ draftId, editedNote });
  };

  const handleRejectNote = async (draftId: string, reason: string) => {
    await rejectAiNoteMutation.mutateAsync({ draftId, reason });
  };

  const handleRequestRevision = async (draftId: string, feedback: string) => {
    await requestRevisionMutation.mutateAsync({ draftId, feedback });
  };

  const handleEditNote = async (draftId: string, editedNote: string) => {
    await editAiNoteMutation.mutateAsync({ draftId, editedNote });
  };

  const latestDraft = aiNoteDrafts?.find(d => d.status === 'draft');
  
  const form = useForm({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patient_id: patientId,
      doctor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      chief_complaint: '',
      physical_examination: '',
      assessment: '',
      plan: '',
      diagnosis_codes: [],
      blood_type: 'Unknown',
      odontogram_data: {},
      history_conditions: [],
      covid19_vaccinated: null,
      drug_allergies: [],
    },
  });

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      covid19_vaccinated: data.covid19_vaccinated === null ? null : data.covid19_vaccinated,
      odontogram_data: data.odontogram_data || {},
    };

    try {
      await addMedicalRecord(payload);
      toast({ title: 'Sukses', description: 'Rekam medis berhasil ditambahkan.' });
      onSuccess();
    } catch (error) {
      toast({ title: 'Gagal', description: `Gagal menambahkan rekam medis: ${error.message}`, variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form id="medical-record-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="visit_date" render={({ field }) => (
            <FormItem>
              <Label>Tanggal Kunjungan</Label>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="doctor_id" render={({ field }) => (
            <FormItem>
              <Label>Dokter Pemeriksa</Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger disabled={isLoadingDoctors}>
                    <SelectValue placeholder={isLoadingDoctors ? "Memuat dokter..." : "Pilih dokter"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {doctors?.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="chief_complaint" render={({ field }) => (
          <FormItem><Label>Keluhan Utama</Label><FormControl><Textarea placeholder="Contoh: Sakit gigi geraham kanan bawah..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="assessment" render={({ field }) => (
          <FormItem><Label>Diagnosa</Label><FormControl><Textarea placeholder="Contoh: Karies profunda..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField
          control={form.control}
          name="diagnosis_codes"
          render={({ field }) => (
            <FormItem>
              <Label>Kode ICD-10 (Opsional)</Label>
              <FormControl>
                <Input
                  placeholder="Contoh: K02.1"
                  value={field.value?.[0] || ''}
                  onChange={(e) => field.onChange(e.target.value ? [e.target.value] : [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="plan" render={({ field }) => (
          <FormItem><Label>Rencana Perawatan</Label><FormControl><Textarea placeholder="Contoh: Ekstraksi gigi..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="physical_examination" render={({ field }) => (
          <FormItem><Label>Pemeriksaan Fisik (Opsional)</Label><FormControl><Textarea placeholder="Hasil pemeriksaan fisik..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <h3 className="text-lg font-semibold pt-4 border-t">Informasi Tambahan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="blood_type" render={({ field }) => (
            <FormItem>
              <Label>Golongan Darah</Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Pilih golongan darah" /></SelectTrigger></FormControl>
                <SelectContent>
                  {['A', 'B', 'AB', 'O', 'Unknown'].map(type => <SelectItem key={type} value={type}>{type === 'Unknown' ? 'Tidak Tahu' : type}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="covid19_vaccinated" render={({ field }) => (
            <FormItem><Label>Vaksin COVID-19</Label>
              <FormControl>
                <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} value={field.value?.toString()} className="flex items-center space-x-4">
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="true" /></FormControl><Label className="font-normal">Sudah</Label></FormItem>
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="false" /></FormControl><Label className="font-normal">Belum</Label></FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="history_conditions" render={() => (
          <FormItem>
            <Label>Riwayat Penyakit Sistemik</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {historyConditionsOptions.map((item) => (
                <FormField key={item} control={form.control} name="history_conditions" render={({ field }) => (
                  <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                      return checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((value) => value !== item))
                    }} /></FormControl>
                    <Label className="font-normal">{item}</Label>
                  </FormItem>
                )} />
              ))}
            </div>
          </FormItem>
        )} />
        
        <FormField
          control={form.control}
          name="drug_allergies"
          render={({ field }) => {
            const [inputValue, setInputValue] = useState('');
            const [isPopoverOpen, setPopoverOpen] = useState(false);
            const inputRef = useRef<HTMLInputElement>(null);

            const handleSelect = (allergy: string) => {
              if (allergy && !field.value.includes(allergy)) {
                field.onChange([...field.value, allergy]);
              }
              setInputValue('');
              setPopoverOpen(false);
            };

            const handleRemove = (allergy: string) => {
              field.onChange(field.value.filter((a) => a !== allergy));
            };

            const filteredOptions = commonDrugAllergies.filter(
              (option) =>
                !field.value.includes(option) &&
                option.toLowerCase().includes(inputValue.toLowerCase())
            );

            return (
              <FormItem>
                <Label>Alergi Obat</Label>
                <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                        {field.value.map((allergy) => (
                          <Badge key={allergy} variant="secondary">
                            {allergy}
                            <button
                              type="button"
                              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              onClick={() => handleRemove(allergy)}
                            >
                              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        ))}
                         <div className="flex-grow" onClick={() => inputRef.current?.focus()}></div>
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput
                        ref={inputRef}
                        placeholder="Cari atau tambah alergi..."
                        value={inputValue}
                        onValueChange={setInputValue}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && inputValue.trim()) {
                            e.preventDefault();
                            handleSelect(inputValue.trim());
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {inputValue.trim() && (
                            <CommandItem
                              onSelect={() => handleSelect(inputValue.trim())}
                            >
                              Tambah: "{inputValue.trim()}"
                            </CommandItem>
                          )}
                           {!inputValue.trim() && "Ketik untuk mencari atau menambah."}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredOptions.map((option) => (
                            <CommandItem
                              key={option}
                              onSelect={() => handleSelect(option)}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value.includes(option)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                 <FormDescription>
                  Pilih dari daftar atau ketik untuk menambahkan alergi baru.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <div className="space-y-2">
          <Label>Odontogram</Label>
          <div className="p-4 border rounded-md bg-gray-50">
            <img src="https://infodrg.com/wp-content/uploads/2020/12/1206D6AF-6FA6-41C5-A2F5-D49B1D86622A.jpeg" alt="Odontogram Example" className="w-full rounded-md" />
            <p className="text-xs text-center text-gray-500 mt-2">Contoh pengisian odontogram.</p>
          </div>
          <FormField
            control={form.control}
            name="odontogram_data"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Odontogram {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* AI Note Generation Section */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold">AI Note Generation</h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiHistory(!showAiHistory)}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Riwayat AI
              {aiNoteDrafts && aiNoteDrafts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{aiNoteDrafts.length}</Badge>
              )}
            </Button>
          </div>

          <Dialog open={showAiComposer} onOpenChange={setShowAiComposer}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-purple-200 bg-purple-50 hover:bg-purple-100"
                onClick={() => {
                  if (!currentDraft && latestDraft) {
                    setCurrentDraft(latestDraft);
                  }
                  setShowAiComposer(true);
                }}
              >
                <Sparkles className="h-4 w-4 text-purple-500" />
                {latestDraft ? 'Lihat Draft AI' : 'Generate AI Note'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Catatan SOAP dari AI</DialogTitle>
                <DialogDescription>
                  Hasil generate catatan SOAP dari transkrip suara. Setujui atau edit sebelum disimpan ke rekam medis.
                </DialogDescription>
              </DialogHeader>
              {currentDraft && (
                <AiNoteComposer
                  draft={currentDraft}
                  onApprove={handleApproveNote}
                  onReject={handleRejectNote}
                  onRequestRevision={handleRequestRevision}
                  onEdit={handleEditNote}
                  isLoading={approveAiNoteMutation.isPending || rejectAiNoteMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Transcription Input for AI Generation */}
          {!showAiComposer && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Input Transkrip Suara
                </CardTitle>
                <CardDescription>
                  Masukkan transkrip dari voice dictation untuk generate catatan SOAP otomatis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Tempelkan transkrip suara di sini... atau ketik hasil anamnesa pasien..."
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleGenerateAiNote(form.getValues('doctor_id') || 'manual')}
                    disabled={isGeneratingNote || !transcription.trim()}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingNote ? 'Menggenerate...' : 'Generate Catatan AI'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Note History */}
          {showAiHistory && aiNoteDrafts && aiNoteDrafts.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="ai-history">
                <AccordionTrigger className="text-sm font-medium">
                  Riwayat Catatan AI ({aiNoteDrafts.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {aiNoteDrafts.map((draft) => (
                      <Card key={draft.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-xs',
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
                                <span className="text-xs text-muted-foreground">
                                  {new Date(draft.created_at).toLocaleString('id-ID', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm line-clamp-2">{draft.generated_note}</p>
                              {draft.icd10_codes && draft.icd10_codes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {draft.icd10_codes.slice(0, 3).map((code, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {code.code}
                                    </Badge>
                                  ))}
                                  {draft.icd10_codes.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{draft.icd10_codes.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            {draft.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentDraft(draft);
                                  setShowAiComposer(true);
                                }}
                              >
                                Lihat
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Smart Coding Section - ICD-10/ICD-9 Suggestions */}
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Kode ICD-10/ICD-9
          </h3>
          <SmartCoding
            selectedIcd10Codes={form.getValues('diagnosis_codes')?.map(code => ({ code, label: code })) || []}
            selectedIcd9Codes={[]}
            onIcd10Select={(codes) => {
              form.setValue('diagnosis_codes', codes.map(c => c.code), { shouldValidate: true });
            }}
            onIcd9Select={() => {}}
            maxSelections={5}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit" disabled={isAdding} form="medical-record-form" className="bg-blue-600 hover:bg-blue-700">
            {isAdding ? 'Menyimpan...' : 'Simpan Rekam Medis'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
