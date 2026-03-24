import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ESignature } from './ESignature'
import { FileText, CheckCircle, Loader2, Download, Send } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export interface ConsentFormData {
  id?: string
  patient_id: string
  appointment_id?: string
  form_type: 'initial' | 'treatment' | 'telehealth' | 'data_consent' | 'privacy' | 'terms'
  title: string
  content: string
  signature_data: string
  signed_at?: string
}

interface ConsentFormProps {
  patientId: string
  appointmentId?: string
  formType?: ConsentFormData['form_type']
  onSigned?: (form: ConsentFormData) => void
  className?: string
}

// Default consent form templates
export const consentFormTemplates: Record<ConsentFormData['form_type'], { title: string; content: string }> = {
  initial: {
    title: 'Formulir Persetujuan Pasien Baru',
    content: `Dengan ini saya memberikan persetujuan untuk mendapatkan perawatan gigi di Klinik Gigi.

Saya memahami dan menyetujui hal-hal berikut:

1. **Informasi Kesehatan**: Saya telah memberikan informasi yang benar tentang kondisi kesehatan saya, termasuk alergi, obat-obatan yang sedang dikonsumsi, dan riwayat medis yang relevan.

2. **Rencana Perawatan**: Saya telah menerima penjelasan tentang rencana perawatan gigi yang direkomendasikan, termasuk risiko dan manfaat yang mungkin terjadi.

3. **Persetujuan Perawatan**: Saya memberikan persetujuan untuk melakukan prosedur perawatan yang telah dijelaskan dan disepakati.

4. **Pembayaran**: Saya memahami bahwa biaya perawatan akan diinformasikan sebelum perawatan dilakukan dan saya bertanggung jawab atas pembayaran.

5. **Penundaan/ Pembatalan**: Saya memahami kebijakan penjadwalan ulang dan pembatalan appointment.

6. **Informasi Lebih Lanjut**: Saya berhak mendapatkan informasi lebih lanjut tentang perawatan saya kapan saja.

Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}
`,
  },
  treatment: {
    title: 'Formulir Persetujuan Tindakan Perawatan',
    content: `FORMULIR PERSETUJUAN TINDAKAN PERAWATAN GIGI

Saya yang bertanda tangan di bawah ini memberikan persetujuan untuk menjalani tindakan perawatan gigi berikut:

1. **Deskripsi Tindakan**: [Nama prosedur akan diisi oleh dokter]

2. **Penjelasan Prosedur**: Saya telah menerima penjelasan lengkap tentang prosedur yang akan dilakukan, termasuk langkah-langkah yang akan ditempuh.

3. **Risiko dan Komplikasi**: Saya memahami bahwa setiap tindakan medis memiliki risiko, termasuk namun tidak terbatas pada:
   - Reaksi terhadap anestesi lokal
   - Perdarahan
   - Infeksi
   - Pembengkakan
   - Nyeri sementara atau permanen
   - Kerusakan saraf (jarang)

4. **Alternatif**: Saya memahami alternatif yang tersedia dan mengapa tindakan ini direkomendasikan.

5. **Konsekuensi Tidak Menjalani Tindakan**: Saya memahami risiko dan konsekuensi jika saya tidak menjalani tindakan ini.

6. **Persetujuan**: Dengan menandatangani di bawah ini, saya memberikan persetujuan sukarela untuk menjalani tindakan yang dijelaskan.

Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}
`,
  },
  telehealth: {
    title: 'Formulir Persetujuan Telekonsultasi',
    content: `PERSETUJUAN TELEKONSULTASI GIGI

Saya menyetujui untuk melakukan konsultasi jarak jauh (telehealth) dengan dokter gigi di Klinik Gigi.

Saya memahami bahwa:

1. **Sifat Konsultasi**: Konsultasi dilakukan melalui video call atau telepon, bukan kunjungan langsung.

2. **Keterbatasan**: Telekonsultasi memiliki keterbatasan dibandingkan pemeriksaan langsung. Dokter dapat memberikan nasihat umum tetapi mungkin perlu pemeriksaan fisik untuk diagnosis yang akurat.

3. **Privasi**: Saya bertanggung jawab memastikan lokasi saya privat selama konsultasi.

4. **Kerahasiaan**: Semua informasi yang saya bagikan akan dijaga kerahasiaannya sesuai peraturan yang berlaku.

5. **Kondisi Darurat**: Jika mengalami kondisi darurat, saya harus langsung ke IGD atau memanggil layanan darurat.

6. **Biaya**: Saya memahami biaya konsultasi telehealth akan diinformasikan sebelumnya.

Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}
`,
  },
  data_consent: {
    title: 'Formulir Persetujuan Pengumpulan Data',
    content: `PERSETUJUAN PENGUMPULAN DAN PENGGUNAAN DATA PRIBADI

Sesuai dengan peraturan perlindungan data yang berlaku, saya memberikan persetujuan untuk:

1. **Pengumpulan Data**: Klinik Gigi dapat mengumpulkan dan menyimpan data pribadi saya termasuk:
   - Data identifikasi (nama, alamat, nomor telepon, email)
   - Data kesehatan (riwayat medis, catatan gigi, foto rontgen)
   - Data keuangan (informasi pembayaran, asuransi)

2. **Penggunaan Data**: Data saya dapat digunakan untuk:
   - Penyediaan layanan kesehatan
   - Administrasi dan penagihan
   - Komunikasi terkait perawatan
   - Penelitian dan peningkatan kualitas (anonim)

3. **Penyimpanan**: Data saya akan disimpan dengan aman sesuai kebijakan keamanan data klinik.

4. **Hak Akses**: Saya dapat mengakses data saya kapan saja dan meminta perbaikan jika diperlukan.

5. **Penarikan Persetujuan**: Saya dapat menarik persetujuan ini kapan saja dengan konfirmasi tertulis.

Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}
`,
  },
  privacy: {
    title: 'Kebijakan Privasi',
    content: `KEBIJAKAN PRIVASI KLINIK GIGI

Terakhir diperbarui: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}

Kami berkomitmen untuk melindungi privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.

**Informasi yang Kami Kumpulkan:**
- Informasi kontak (nama, alamat, telepon, email)
- Informasi kesehatan (riwayat medis gigi, perawatan yang dilakukan)
- Informasi pembayaran

**Bagaimana Kami Menggunakan Informasi Anda:**
- Untuk menyediakan layanan kesehatan gigi
- Untuk berkomunikasi dengan Anda tentang appointments dan perawatan
- Untuk administrasi klinik
- Untuk mematuhi kewajiban hukum

**Perlindungan Data:**
Kami menggunakan langkah-langkah keamanan yang sesuai untuk melindungi informasi Anda dari akses yang tidak sah.

**Hak Anda:**
- Akses ke data Anda
- Koreksi data yang tidak akurat
- Penghapusan data (dengan batasan hukum)
- Keberatan atas pemrosesan tertentu

Untuk informasi lebih lanjut, hubungi kami.
`,
  },
  terms: {
    title: 'Syarat dan Ketentuan',
    content: `SYARAT DAN KETENTUAN LAYANAN

Terakhir diperbarui: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}

Dengan menggunakan layanan Klinik Gigi, Anda menyetujui syarat dan ketentuan berikut:

**Layanan:**
Kami menyediakan layanan perawatan gigi profesional. Semua prosedur dilakukan oleh dokter gigi berlisensi.

**Jadwal dan Pembatalan:**
- Appointment dapat dijadwalkan melalui website, telepon, atau langsung
- Pembatalan harus dilakukan minimal 24 jam sebelum jadwal
- Ketidakhadiran tanpa konfirmasi dapat dikenakan biaya

**Pembayaran:**
- Pembayaran dilakukan setelah layanan diberikan
- Kami menerima berbagai metode pembayaran
- Asuransi dapat digunakan sesuai ketentuan Polis

**Komplain:**
- Jika tidak puas dengan layanan, silakan hubungi kami
- Kami akan berusaha menyelesaikan setiap komplain dengan adil

**Perubahan Syarat:**
Kami berhak mengubah syarat ini dengan pemberitahuan terlebih dahulu.
`,
  },
}

export function ConsentForm({
  patientId,
  appointmentId,
  formType = 'initial',
  onSigned,
  className = '',
}: ConsentFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [customContent, setCustomContent] = useState('')
  const [showTemplate, setShowTemplate] = useState(true)

  const template = consentFormTemplates[formType]
  const formContent = customContent || template.content

  // Fetch existing consent forms for this patient
  const { data: existingForms } = useQuery({
    queryKey: ['consent-forms', patientId, formType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('patient_id', patientId)
        .eq('form_type', formType)
        .order('signed_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  })

  // Submit consent form mutation
  const submitConsent = useMutation({
    mutationFn: async () => {
      if (!signature) {
        throw new Error('Tanda tangan diperlukan')
      }

      // Get client IP (approximation for browser)
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()

      const { data, error } = await supabase
        .from('consent_forms')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId || null,
          form_type: formType,
          title: template.title,
          content: formContent,
          signature_data: signature,
          signed_at: new Date().toISOString(),
          ip_address: ipData.ip || null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast({
        title: 'Formulir Terkirim',
        description: 'Persetujuan berhasil disimpan.',
      })
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] })
      setSignature('')
      setAgreed(false)
      onSigned?.(data as ConsentFormData)
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Menyimpan',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = () => {
    if (!agreed) {
      toast({
        title: 'Persetujuan Diperlukan',
        description: 'Silakan centang persetujuan Anda.',
        variant: 'destructive',
      })
      return
    }

    if (!signature) {
      toast({
        title: 'Tanda Tangan Diperlukan',
        description: 'Silakan isi tanda tangan Anda.',
        variant: 'destructive',
      })
      return
    }

    submitConsent.mutate()
  }

  const downloadPdf = () => {
    // For now, just download as text file
    const content = `${template.title}\n${'='.repeat(template.title.length)}\n\n${formContent}\n\nTanda Tangan:\n${signature ? '[TERTANDA]' : '[BELUM TERTANDA]'}\n\nTanggal: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${formType}-consent-${format(new Date(), 'yyyy-MM-dd')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {template.title}
        </CardTitle>
        <CardDescription>
          Baca dengan seksama dan tanda tangani di bawah untuk menyetujui
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing forms indicator */}
        {existingForms && existingForms.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800">
              Anda telah menandatangani formulir ini pada{' '}
              {format(new Date(existingForms[0].signed_at!), 'dd MMMM yyyy', { locale: id })}
            </span>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">
            {formContent}
          </pre>
        </div>

        {/* Agreement Checkbox */}
        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Checkbox
            id="agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
          />
          <Label htmlFor="agree" className="text-sm cursor-pointer">
            Saya telah membaca dan memahami isi formulir di atas. Dengan mencentang
            ini, saya memberikan persetujuan saya yang sebenarnya dan tidak dipaksa.
          </Label>
        </div>

        {/* Signature */}
        <ESignature
          value={signature}
          onChange={setSignature}
          width={Math.min(500, 100)}
          height={150}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={downloadPdf}
            className="gap-1"
          >
            <Download className="w-4 h-4" />
            Unduh
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!agreed || !signature || submitConsent.isPending}
            className="flex-1"
          >
            {submitConsent.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Kirim Formulir
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}