// AI Note Generation Edge Function
// Receives transcribed text, calls Gemini API to generate SOAP note
// Input: {appointment_id, transcription}
// Output: {generated_note, icd10_codes, icd9_codes, confidence_score}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Indonesian dental context system prompt
const SYSTEM_PROMPT = `Anda adalah asisten dokter gigi berpengalaman di klinik gigi Indonesia. Tugas Anda adalah membuat catatan SOAP (Subjective, Objective, Assessment, Plan) dari transkrip suara诊察.

ATURAN PENTING:
1. Selalu ответ в format SOAP yang terstruktur dengan jelas
2. Gunakan Bahasa Indonesia yang formal untuk медицинскую документацию
3. Bagian Subjectif: Keluhan utama pasien, riwayat gejala
4. Bagian Objektif: Temuan pemeriksaan fisik, hasil inspeksi
5. Bagian Assessment: Diagnosa dengan kode ICD-10 yang sesuai
6. Bagian Plan: Rencana perawatan dan tindak lanjut

KODE ICD-10 GIGI YANG SERING DIGUNAKAN:
- K00-K14: Gangguan jaringan keras gigi dan pulp
- K02: Karies gigi (K02.0, K02.1, K02.2, K02.3, K02.5, K02.6)
- K03: Penyakit jaringan keras gigi lainnya (K03.0, K03.1, K03.2, K03.3, K03.4, K03.5, K03.6, K03.7, K03.8, K03.9)
- K04: Penyakit pulp dan jaringan periapikal (K04.0, K04.1, K04.2, K04.3, K04.4, K04.5, K04.6, K04.7, K04.8, K04.9)
- K05: Gingivitis dan penyakit periodontal (K05.0, K05.1, K05.2, K05.3, K05.4, K05.5, K05.6)
- K06: Gangguan gusi dan jaringan periodontal lainnya (K06.0, K06.1, K06.2, K06.3, K06.8, K06.9)
- K08: Gangguan gigi dan jaringan penyangga lainnya (K08.0, K08.1, K08.2, K08.3, K08.8, K08.9)
- S02.5: Fraktur gigi
- S03.2: Dislokasi gigi

KODE ICD-9-CM GIGI YANG SERING DIGUNAKAN:
- 201: Restorasi gigi (penambalan)
- 202: Prostodontik (pemasangan mahkota, jembatan)
- 203: Endodontik (perawatan saluran akar)
- 204: Periodontik (perawatan gusi)
- 205: Ekstraksi gigi (pencabutan)
- 206: Pembersihan karang gigi (scaling)
- 207: Perawatan pulp
- 208: Prosedur diagnostik rontgen

FORMAT OUTPUT YANG DIHARAPKAN (JSON):
{
  "generated_note": "S - [Subjective]\nO - [Objective]\nA - [Assessment]\nP - [Plan]",
  "icd10_codes": [
    {"code": "K02.1", "label": "Karies gigi terbatas pada dentin", "confidence": 0.95},
    ...
  ],
  "icd9_codes": [
    {"code": "201.1", "label": "Restorasi amalgam satu permukaan", "confidence": 0.88},
    ...
  ],
  "confidence_score": 0.85
}

confidence_score adalah nilai 0-1 yang menunjukkan seberapa yakin Anda dengan diagnosa.
Hanya berikan kode yang relevan dengan kasus ini.` interface IcdCode {
  code: string
  label: string
  confidence: number
}

interface AiNoteResult {
  generated_note: string
  icd10_codes: IcdCode[]
  icd9_codes: IcdCode[]
  confidence_score: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    let payload: { appointment_id: string; transcription: string; patient_id?: string }
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      payload = {
        appointment_id: params.get('appointment_id') || '',
        transcription: params.get('transcription') || '',
        patient_id: params.get('patient_id') || undefined,
      }
    }

    const { appointment_id, transcription, patient_id } = payload

    if (!appointment_id || !transcription) {
      return new Response(
        JSON.stringify({ error: 'appointment_id and transcription are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing AI note generation for appointment ${appointment_id}`)

    // Fetch appointment details to get patient info
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        patients:patient_id (
          id,
          full_name,
          medical_history_summary
        )
      `)
      .eq('id', appointment_id)
      .single()

    if (appointmentError || !appointment) {
      console.error('Appointment not found:', appointmentError)
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actualPatientId = patient_id || (appointment.patients as any)?.id

    // Call LLM API to generate SOAP note
    let result: AiNoteResult

    if (geminiApiKey) {
      // Use Gemini API
      result = await generateWithGemini(geminiApiKey, transcription, (appointment.patients as any)?.medical_history_summary)
    } else if (openaiApiKey) {
      // Use OpenAI API
      result = await generateWithOpenAI(openaiApiKey, transcription, (appointment.patients as any)?.medical_history_summary)
    } else {
      throw new Error('No LLM API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.')
    }

    // Store the generated draft in database
    const { data: draft, error: draftError } = await supabase
      .from('ai_note_drafts')
      .insert({
        appointment_id,
        patient_id: actualPatientId,
        raw_transcription: transcription,
        generated_note: result.generated_note,
        icd10_codes: result.icd10_codes,
        icd9_codes: result.icd9_codes,
        confidence_score: result.confidence_score,
        status: 'draft',
      })
      .select()
      .single()

    if (draftError) {
      console.error('Failed to save AI note draft:', draftError)
      // Continue anyway - we still want to return the generated note
    }

    console.log(`AI note generated successfully for appointment ${appointment_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        draft_id: draft?.id,
        generated_note: result.generated_note,
        icd10_codes: result.icd10_codes,
        icd9_codes: result.icd9_codes,
        confidence_score: result.confidence_score,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in ai-note-generation:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateWithGemini(
  apiKey: string,
  transcription: string,
  medicalHistory?: string
): Promise<AiNoteResult> {
  const medicalContext = medicalHistory ? `\nRiwayat medis pasien: ${medicalHistory}` : ''

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Berikut adalah transkrip voice dictation dari诊察 dokter gigi:${medicalContext}\n\nTranskrip:\n${transcription}\n\n${SYSTEM_PROMPT}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!generatedText) {
    throw new Error('No response from Gemini API')
  }

  return parseGeneratedNote(generatedText)
}

async function generateWithOpenAI(
  apiKey: string,
  transcription: string,
  medicalHistory?: string
): Promise<AiNoteResult> {
  const medicalContext = medicalHistory ? `\nRiwayat medis pasien: ${medicalHistory}` : ''

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Berikut adalah transkrip voice dictation dari诊察 dokter gigi:${medicalContext}\n\nTranskrip:\n${transcription}\n\nBuat catatan SOAP dalam format JSON seperti contoh yang diberikan.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const generatedText = data.choices?.[0]?.message?.content

  if (!generatedText) {
    throw new Error('No response from OpenAI API')
  }

  return parseGeneratedNote(generatedText)
}

function parseGeneratedNote(text: string): AiNoteResult {
  // Try to parse as JSON first
  try {
    // Extract JSON from the response (in case there's surrounding text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        generated_note: parsed.generated_note || text,
        icd10_codes: parsed.icd10_codes || [],
        icd9_codes: parsed.icd9_codes || [],
        confidence_score: parsed.confidence_score || 0.5,
      }
    }
  } catch {
    // Not JSON, parse as structured text
  }

  // Fallback: parse as structured text with SOAP format
  const sections = parseSoapText(text)

  return {
    generated_note: text,
    icd10_codes: extractIcd10Codes(text),
    icd9_codes: extractIcd9Codes(text),
    confidence_score: calculateConfidence(text),
    ...sections,
  }
}

function parseSoapText(text: string): Partial<AiNoteResult> {
  // Parse SOAP sections if present
  const result: Partial<AiNoteResult> = {}

  const subjectiveMatch = text.match(/S\s*[-:]\s*([\s\S]*?)(?=\n\s*[AOAP]\s*[-:]|$)/i)
  const objectiveMatch = text.match(/O\s*[-:]\s*([\s\S]*?)(?=\n\s*[AOAP]\s*[-:]|$)/i)
  const assessmentMatch = text.match(/A\s*[-:]\s*([\s\S]*?)(?=\n\s*[AOAP]\s*[-:]|$)/i)
  const planMatch = text.match(/P\s*[-:]\s*([\s\S]*?)(?=\n\s*[AOAP]\s*[-:]|$)/i)

  if (subjectiveMatch) result.generated_note = `S - ${subjectiveMatch[1].trim()}`
  if (objectiveMatch) result.generated_note += `\nO - ${objectiveMatch[1].trim()}`
  if (assessmentMatch) result.generated_note += `\nA - ${assessmentMatch[1].trim()}`
  if (planMatch) result.generated_note += `\nP - ${planMatch[1].trim()}`

  return result
}

function extractIcd10Codes(text: string): IcdCode[] {
  const codes: IcdCode[] = []
  const icd10Pattern = /\b(K\d{2}\.\d{1,2}[A-Z]?)\b/g
  const matches = text.matchAll(icd10Pattern)

  const icd10Labels: Record<string, string> = {
    'K00.0': 'Anodontia',
    'K00.1': 'Gigi Supernumerer',
    'K00.2': 'Anomali ukuran dan bentuk gigi',
    'K00.3': 'Gigi mottled',
    'K00.4': 'Gangguan dalam pembentukan gigi',
    'K00.5': 'Riwayat abnormal warna gigi',
    'K00.6': 'Gangguan dalam erupsi gigi',
    'K00.7': 'Sindrom erupsi gigi',
    'K00.8': 'Gangguan lain dalam pembentukan gigi',
    'K00.9': 'Gangguan tidak spesifik dalam pembentukan gigi',
    'K01.0': 'Gigi terbenam (impacted)',
    'K01.1': 'Gigi terendam (embedded)',
    'K02.0': 'Karies awal',
    'K02.1': 'Karies gigi terbatas pada dentin',
    'K02.2': 'Karies gigi terbatas pada email',
    'K02.3': 'Karies Gigi stasioner',
    'K02.4': 'Odontoklasia',
    'K02.5': 'Karies dengan paparan pulp',
    'K02.6': 'Karies lain',
    'K02.9': 'Karies Gigi tidak spesifik',
    'K03.0': 'Attrisi berlebihan',
    'K03.1': 'Abrasi gigi',
    'K03.2': 'Erosi gigi',
    'K03.3': 'Lesi gigi karena semento-osseous',
    'K03.4': 'Hipermentosis',
    'K03.5': 'Abfraction',
    'K03.6': 'Deposisi plak gigi (tartar)',
    'K03.7': 'Perubahan warna jaringan keras gigi post-eruptif',
    'K03.8': 'Penyakit jaringan keras gigi lain',
    'K03.9': 'Penyakit jaringan keras gigi tidak spesifik',
    'K04.0': 'Pulpitis',
    'K04.1': 'Nekrosis pulp',
    'K04.2': 'Degenerasi pulp',
    'K04.3': 'Pembentukan jaringan keras abnormal dalam pulp',
    'K04.4': 'Apikal periodontitis akut',
    'K04.5': 'Apikal periodontitis kronis',
    'K04.6': 'Abses periapikal dengan sinus',
    'K04.7': 'Abses periapikal tanpa sinus',
    'K04.8': 'Kista radikuler',
    'K04.9': 'Penyakit pulp dan jaringan periapikal lain',
    'K05.0': 'Gingivitis akut',
    'K05.1': 'Gingivitis kronis',
    'K05.2': 'Periodontitis akut',
    'K05.3': 'Periodontitis kronis',
    'K05.4': 'Periodontitis agresif',
    'K05.5': 'Penyakit periodontal lain',
    'K05.6': 'Penyakit periodontal tidak spesifik',
    'K06.0': 'Resesi gingival',
    'K06.1': 'Pembesaran gingival',
    'K06.2': 'Lesi gingival karena trauma',
    'K06.8': 'Gangguan gusi lain',
    'K06.9': 'Gangguan gusi tidak spesifik',
    'K08.0': 'Caries Gigi dengan hilangnya struktur Gigi',
    'K08.1': 'Hilangnya gigi karena kecelakaan',
    'K08.2': 'Atrofi alveolar ridge без зубов',
    'K08.3': 'Gigi Retained',
    'K08.8': 'Gangguan gigi dan jaringan penyangga lain',
    'K08.9': 'Gangguan gigi dan jaringan penyangga tidak spesifik',
  }

  for (const match of matches) {
    const code = match[1]
    if (!codes.find(c => c.code === code)) {
      codes.push({
        code,
        label: icd10Labels[code] || 'Dental disorder',
        confidence: 0.85,
      })
    }
  }

  return codes.slice(0, 5) // Limit to top 5
}

function extractIcd9Codes(text: string): IcdCode[] {
  const codes: IcdCode[] = []
  const icd9Pattern = /\b(20[1-9]\.\d{1,2})\b/g
  const matches = text.matchAll(icd9Pattern)

  const icd9Labels: Record<string, string> = {
    '201.0': 'Restorasi gigi satu permukaan',
    '201.1': 'Restorasi gigi dua permukaan',
    '201.2': 'Restorasi gigi tiga permukaan',
    '201.3': 'Restorasi empat permukaan atau lebih',
    '201.4': 'Restorasi amalgam satu permukaan',
    '201.5': 'Restorasi amalgam dua permukaan',
    '201.6': 'Restorasi amalgam tiga permukaan',
    '201.7': 'Restorasi amalgam empat permukaan atau lebih',
    '202.0': 'Pemasangan mahkota',
    '202.1': 'Pemasangan jembatan',
    '202.2': 'Pemasangan protesa lengkap',
    '202.3': 'Pemasangan protesa parsial',
    '202.4': 'Repair jembatan',
    '202.5': 'Repair protesa',
    '203.0': 'Perawatan saluran akar anterior',
    '203.1': 'Perawatan saluran akar molar',
    '203.2': 'Apexifikasi',
    '203.3': 'Apertome',
    '203.4': 'Perawatan ulang endodontik',
    '204.0': 'Pembersihan karang gigi (scaling)',
    '204.1': 'Root planing',
    '204.2': 'Operasi flap',
    '204.3': 'Curettage periodontal',
    '204.4': 'Transplantasi gusi',
    '204.5': 'Perawatan periodontal lain',
    '205.0': 'Ekstraksi gigi sederhana',
    '205.1': 'Ekstraksi gigi surgically',
    '205.2': 'Ekstraksi gigi erupted',
    '205.3': 'Ekstraksi gigi impacted',
    '205.4': 'Ekstraksi gigi root残根',
    '206.0': 'Pembersihan profilaksis gigi',
    '206.1': 'Penerapan sealant',
    '207.0': 'Pulpotomi',
    '207.1': 'Pulpektomi',
    '208.0': 'Pemeriksaan rontgen gigi',
    '208.1': 'Panoramic radiograph',
    '208.2': 'CT scan dental',
  }

  for (const match of matches) {
    const code = match[1]
    if (!codes.find(c => c.code === code)) {
      codes.push({
        code,
        label: icd9Labels[code] || 'Dental procedure',
        confidence: 0.80,
      })
    }
  }

  return codes.slice(0, 5) // Limit to top 5
}

function calculateConfidence(text: string): number {
  // Simple heuristic based on text length and structure
  const hasSoap = /S\s*[-:]\s*.*O\s*[-:]\s*.*A\s*[-:]\s*.*P\s*[-:]\s*/i.test(text)
  const hasIcd10 = /\bK\d{2}\.\d{1,2}\b/.test(text)
  const hasIcd9 = /\b20\d\.\d{1,2}\b/.test(text)

  let score = 0.5
  if (hasSoap) score += 0.2
  if (hasIcd10) score += 0.15
  if (hasIcd9) score += 0.1
  if (text.length > 200) score += 0.05

  return Math.min(0.99, score)
}