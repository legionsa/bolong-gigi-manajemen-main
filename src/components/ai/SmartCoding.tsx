import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Search, Stethoscope, ClipboardList, Plus, Check, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IcdCode {
  code: string
  label: string
  confidence?: number
}

// ICD-10 Dental Codes Database
const ICD10_CODES: IcdCode[] = [
  // K00 - Disorders of tooth development
  { code: 'K00.0', label: 'Anodontia (Tidak ada gigi)' },
  { code: 'K00.1', label: 'Supernumerary teeth (Gigi supernumerer)' },
  { code: 'K00.2', label: 'Abnormalities of size and form of teeth (Anomali ukuran dan bentuk gigi)' },
  { code: 'K00.3', label: 'Mottled teeth (Gigi mottled/fluorosis)' },
  { code: 'K00.4', label: 'Disturbances in tooth formation (Gangguan pembentukan gigi)' },
  { code: 'K00.5', label: 'Hereditary disturbances in tooth structure (Kelainan herediter struktur gigi)' },
  { code: 'K00.6', label: 'Disturbances in tooth eruption (Gangguan erupsi gigi)' },
  { code: 'K00.7', label: 'Teething syndrome (Sindrom erupsi gigi)' },
  { code: 'K00.8', label: 'Other disorders of tooth development (Gangguan lain perkembangan gigi)' },
  { code: 'K00.9', label: 'Disorder of tooth development, unspecified' },

  // K01 - Embedded and impacted teeth
  { code: 'K01.0', label: 'Embedded teeth (Gigi terbenam/impaksi)' },
  { code: 'K01.1', label: 'Impacted teeth (Gigi terendam)' },

  // K02 - Dental caries
  { code: 'K02.0', label: 'Caries limited to enamel (Karies hanya email)' },
  { code: 'K02.1', label: 'Caries of dentin (Karies dentin)' },
  { code: 'K02.2', label: 'Caries of cementum (Karies sementum)' },
  { code: 'K02.3', label: 'Arrested dental caries (Karies stasioner)' },
  { code: 'K02.4', label: 'Odontoclasia (Odontoklasia)' },
  { code: 'K02.5', label: 'Caries with pulp exposure (Karies dengan paparan pulp)' },
  { code: 'K02.51', label: 'Caries with pulp exposure - acute (Karies akut)' },
  { code: 'K02.52', label: 'Caries with pulp exposure - chronic (Karies kronis)' },
  { code: 'K02.6', label: 'Other dental caries (Karies lain)' },
  { code: 'K02.9', label: 'Dental caries, unspecified' },

  // K03 - Other diseases of hard tissues of teeth
  { code: 'K03.0', label: 'Excessive attrition (Attrisi berlebihan)' },
  { code: 'K03.1', label: 'Abrasion of teeth (Abrasi gigi)' },
  { code: 'K03.2', label: 'Erosion of teeth (Erosi gigi)' },
  { code: 'K03.3', label: 'Pathological resorption of teeth (Resorpsi patologis)' },
  { code: 'K03.4', label: 'Hypercementosis (Hipersemento-skeleton)' },
  { code: 'K03.5', label: 'Abfraction (Abfraksi)' },
  { code: 'K03.6', label: 'Deposits on teeth (Deposisi plak/karang gigi)' },
  { code: 'K03.7', label: 'Posteruptive color changes of teeth (Perubahan warna post-eruptif)' },
  { code: 'K03.8', label: 'Other specified diseases of hard tissues of teeth' },
  { code: 'K03.9', label: 'Disease of hard tissues of teeth, unspecified' },

  // K04 - Diseases of pulp and periapical tissues
  { code: 'K04.0', label: 'Pulpitis (Radang pulp)' },
  { code: 'K04.01', label: 'Pulpitis - acute (Pulpitis akut)' },
  { code: 'K04.02', label: 'Pulpitis - chronic (Pulpitis kronis)' },
  { code: 'K04.1', label: 'Necrosis of pulp (Nekrosis pulp)' },
  { code: 'K04.2', label: 'Degeneration of pulp (Degenerasi pulp)' },
  { code: 'K04.3', label: 'Abnormal hard tissue formation in pulp (Formasi jaringan keras abnormal)' },
  { code: 'K04.4', label: 'Acute apical periodontitis (Periodontitis apikal akut)' },
  { code: 'K04.5', label: 'Chronic apical periodontitis (Periodontitis apikal kronis)' },
  { code: 'K04.6', label: 'Periapical abscess with sinus (Abses periapikal dengan sinus)' },
  { code: 'K04.7', label: 'Periapical abscess without sinus (Abses periapikal tanpa sinus)' },
  { code: 'K04.8', label: 'Radicular cyst (Kista radikuler)' },
  { code: 'K04.9', label: 'Other and unspecified diseases of pulp and periapical tissues' },

  // K05 - Gingivitis and periodontal diseases
  { code: 'K05.0', label: 'Acute gingivitis (Gingivitis akut)' },
  { code: 'K05.00', label: 'Acute streptococcal gingivitis' },
  { code: 'K05.01', label: 'Acute necrotizing ulcerative gingivitis (ANUG) (Gingivitis ulseratif nekrotikans akut)' },
  { code: 'K05.1', label: 'Chronic gingivitis (Gingivitis kronis)' },
  { code: 'K05.10', label: 'Chronic gingivitis, PLAQUE induced (Gingivitis kronis karena plak)' },
  { code: 'K05.11', label: 'Chronic gingivitis, non-plaque induced (Gingivitis kronis non-plak)' },
  { code: 'K05.2', label: 'Acute periodontitis (Periodontitis akut)' },
  { code: 'K05.20', label: 'Acute periodontitis (Periodontitis akut)' },
  { code: 'K05.21', label: 'Aggressive periodontitis, acute (Periodontitis agresif akut)' },
  { code: 'K05.3', label: 'Chronic periodontitis (Periodontitis kronis)' },
  { code: 'K05.30', label: 'Chronic periodontitis (Periodontitis kronis)' },
  { code: 'K05.31', label: 'Aggressive periodontitis, chronic (Periodontitis agresif kronis)' },
  { code: 'K05.4', label: 'Periodontosis (Periodontosis)' },
  { code: 'K05.5', label: 'Other periodontal diseases (Penyakit periodontal lain)' },
  { code: 'K05.6', label: 'Periodontal disease, unspecified (Penyakit periodontal tidak spesifik)' },

  // K06 - Other disorders of gingiva and edentulous alveolar ridge
  { code: 'K06.0', label: 'Gingival recession (Resesi gingival)' },
  { code: 'K06.1', label: 'Gingival enlargement (Pembesaran gingival)' },
  { code: 'K06.2', label: 'Gingival and edentulous alveolar ridge lesions due to trauma (Lesi karena trauma)' },
  { code: 'K06.3', label: 'Horizontal alveolar bone loss (Hilangnya tulang alveolar horizontal)' },
  { code: 'K06.8', label: 'Other specified disorders of gingiva and edentulous ridge' },
  { code: 'K06.9', label: 'Disorder of gingiva and edentulous ridge, unspecified' },

  // K08 - Other disorders of teeth and supporting structures
  { code: 'K08.0', label: 'Excessive attrition of teeth (Attrisi gigi berlebihan)' },
  { code: 'K08.1', label: 'Complete loss of teeth due to accident (Hilangnya gigi karena kecelakaan)' },
  { code: 'K08.10', label: 'Complete loss of teeth due to accident, initial encounter' },
  { code: 'K08.101', label: 'Complete loss of teeth due to accident, initial encounter - upper' },
  { code: 'K08.102', label: 'Complete loss of teeth due to accident, initial encounter - lower' },
  { code: 'K08.11', label: 'Complete loss of teeth due to extraction (Hilangnya gigi karena ekstraksi)' },
  { code: 'K08.12', label: 'Atrophy of edentulous alveolar ridge (Atrofi ridge alveolar tanpa gigi)' },
  { code: 'K08.2', label: 'Retained dental prosthesis (Gigi retainer/prostesa gigi retained)' },
  { code: 'K08.3', label: 'Tooth without dental prosthesis (Gigi tanpa prostesa)' },
  { code: 'K08.4', label: 'Partial loss of teeth (Hilangnya gigi sebagian)' },
  { code: 'K08.40', label: 'Partial loss of teeth, unspecified' },
  { code: 'K08.41', label: 'Partial loss of teeth due to caries (Hilangnya gigi sebagian karena karies)' },
  { code: 'K08.42', label: 'Partial loss of teeth due to trauma (Hilangnya gigi sebagian karena trauma)' },
  { code: 'K08.43', label: 'Partial loss of teeth due to extraction (Hilangnya gigi sebagian karena ekstraksi)' },
  { code: 'K08.8', label: 'Other specified disorders of teeth and supporting structures' },
  { code: 'K08.81', label: 'Primary occlusal trauma (Trauma oklusal primer)' },
  { code: 'K08.82', label: 'Secondary occlusal trauma (Trauma oklusal sekunder)' },
  { code: 'K08.83', label: 'Cracked tooth (Gigi retak)' },
  { code: 'K08.9', label: 'Disorder of teeth and supporting structures, unspecified' },

  // S02 - Fracture of skull and facial bones (for dental trauma)
  { code: 'S02.5', label: 'Fracture of tooth (Fraktur gigi)' },
  { code: 'S02.5XXA', label: 'Fracture of tooth, initial encounter (Fraktur gigi, kunjungan awal)' },
  { code: 'S02.5XXD', label: 'Fracture of tooth, subsequent encounter (Fraktur gigi, kunjungan lanjut)' },
  { code: 'S02.5XXS', label: 'Fracture of tooth, sequela (Fraktur gigi, sekuela)' },

  // S03 - Dislocation of jaw, cartilage injuries
  { code: 'S03.2', label: 'Dislocation of tooth (Dislokasi gigi)' },
]

// ICD-9-CM Dental Codes Database
const ICD9_CODES: IcdCode[] = [
  // 201 - Dental restoration
  { code: '201.0', label: 'Dental restoration, one surface (Restorasi satu permukaan)' },
  { code: '201.1', label: 'Dental restoration, two surfaces (Restorasi dua permukaan)' },
  { code: '201.2', label: 'Dental restoration, three surfaces (Restorasi tiga permukaan)' },
  { code: '201.3', label: 'Dental restoration, four or more surfaces (Restorasi empat+ permukaan)' },
  { code: '201.4', label: 'Dental restoration, sealant (Penerapan sealant)' },
  { code: '201.5', label: 'Dental restoration, inlay (Restorasi inlay)' },
  { code: '201.6', label: 'Dental restoration, onlay (Restorasi onlay)' },
  { code: '201.8', label: 'Other dental restoration (Restorasi lain)' },
  { code: '201.9', label: 'Unspecified dental restoration (Restorasi tidak spesifik)' },

  // 202 - Prosthetic dentistry
  { code: '202.0', label: 'Initial insertion of teeth (Pasang gigi pertama kali)' },
  { code: '202.1', label: 'Replacement of teeth (Penggantian gigi)' },
  { code: '202.2', label: 'Dental crown (Mahkota gigi)' },
  { code: '202.3', label: 'Dental bridge (Jembatan gigi)' },
  { code: '202.4', label: 'Dental dentures (Protese gigi lengkap/parcial)' },
  { code: '202.5', label: 'Dental implant (Implant gigi)' },
  { code: '202.6', label: 'Dental repair (Perbaikan gigi)' },
  { code: '202.8', label: 'Other prosthetic dentistry (Prostodontik lain)' },

  // 203 - Endodontics
  { code: '203.0', label: 'Root canal therapy, single tooth (Perawatan saluran akar satu gigi)' },
  { code: '203.1', label: 'Root canal therapy, two teeth (Perawatan saluran akar dua gigi)' },
  { code: '203.2', label: 'Root canal therapy, three or more teeth (Perawatan saluran akar tiga+ gigi)' },
  { code: '203.3', label: 'Apexification (Apeksifikasi)' },
  { code: '203.4', label: 'Apertome / Root resection (Reseksi apex)' },
  { code: '203.5', label: 'Pulpotomy (Pulpotomi)' },
  { code: '203.6', label: 'Pulpectomy (Pulpektomi)' },
  { code: '203.7', label: 'Endodontic retreatment (Perawatan ulang endodontik)' },
  { code: '203.8', label: 'Other endodontic procedures (Prosedur endodontik lain)' },

  // 204 - Periodontics
  { code: '204.0', label: 'Dental scaling and root planing (Scaling dan root planing)' },
  { code: '204.1', label: 'Periodontal prophylaxis (Profilaksis periodontal)' },
  { code: '204.2', label: 'Gingivectomy (Gingivektomi)' },
  { code: '204.3', label: 'Gingivoplasty (Gingivoplasti)' },
  { code: '204.4', label: 'Flap operation (Operasi flap)' },
  { code: '204.5', label: 'Curettage, periodontal (Kuretase periodontal)' },
  { code: '204.6', label: 'Guided tissue regeneration (Regenerasi jaringan terbimbing)' },
  { code: '204.7', label: 'Osseous surgery (Operasi osseous)' },
  { code: '204.8', label: 'Other periodontic procedures (Prosedur periodontik lain)' },

  // 205 - Tooth extraction
  { code: '205.0', label: 'Simple extraction (Ekstraksi sederhana)' },
  { code: '205.1', label: 'Surgical extraction (Ekstraksi chirurgis)' },
  { code: '205.2', label: 'Extraction of erupted tooth (Pencabutan gigi yang erupsi)' },
  { code: '205.3', label: 'Extraction of impacted tooth (Pencabutan gigi impaksi)' },
  { code: '205.4', label: 'Extraction of root (Pencabutan akar)' },
  { code: '205.5', label: 'Extraction of supernumerary tooth (Pencabutan gigi supernumerer)' },
  { code: '205.8', label: 'Other extraction (Pencabutan lain)' },

  // 206 - Preventive dentistry
  { code: '206.0', label: 'Dental prophylaxis (Profilaksis gigi)' },
  { code: '206.1', label: 'Topical fluoride treatment (Perawatan fluorida topikal)' },
  { code: '206.2', label: 'Dental sealant (Sealant gigi)' },
  { code: '206.3', label: 'Dental plaque control (Kontrol plak gigi)' },
  { code: '206.4', label: 'Oral hygiene instruction (Instruksi kebersihan oral)' },
  { code: '206.5', label: 'Dietary counseling for dental health (Konseling diet)' },

  // 207 - Diagnostic dental procedures
  { code: '207.0', label: 'Diagnostic intraoral radiograph (Foto rontgen intraoral)' },
  { code: '207.1', label: 'Diagnostic extraoral radiograph (Foto rontgen ekstraoral)' },
  { code: '207.2', label: 'Panoramic radiograph (Foto panoramik)' },
  { code: '207.3', label: 'Dental CT scan (CT scan dental)' },
  { code: '207.4', label: 'Vitality test (Tes vitalitas)' },
  { code: '207.5', label: 'Diagnostic study model (Model studi diagnostik)' },

  // 208 - Other dental procedures
  { code: '208.0', label: 'Biopsy of oral tissue (Biopsi jaringan oral)' },
  { code: '208.1', label: 'Frenectomy (Frenektomi)' },
  { code: '208.2', label: 'Sialography (Sialografi)' },
  { code: '208.3', label: 'Luxation or closed reduction of tooth (Reduksi dislokasi gigi)' },
  { code: '208.4', label: 'Open reduction of tooth fracture (Reduksi terbuka fraktur gigi)' },
  { code: '208.5', label: 'Application of orthodontic appliance (Pemasangan alat ortodonti)' },
  { code: '208.6', label: 'Adjustment of orthodontic appliance (Penyesuaian alat ortodonti)' },
  { code: '208.7', label: 'Emergency procedures for dental pain (Prosedur darurat untuk nyeri dental)' },
  { code: '208.8', label: 'Other dental procedures (Prosedur dental lain)' },
]

interface SmartCodingProps {
  selectedIcd10Codes?: IcdCode[]
  selectedIcd9Codes?: IcdCode[]
  onIcd10Select?: (codes: IcdCode[]) => void
  onIcd9Select?: (codes: IcdCode[]) => void
  maxSelections?: number
}

export function SmartCoding({
  selectedIcd10Codes = [],
  selectedIcd9Codes = [],
  onIcd10Select,
  onIcd9Select,
  maxSelections = 5,
}: SmartCodingProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'icd10' | 'icd9'>('icd10')

  const filteredIcd10 = useMemo(() => {
    if (!searchTerm) return ICD10_CODES.slice(0, 10)

    const term = searchTerm.toLowerCase()
    return ICD10_CODES.filter(
      (code) =>
        code.code.toLowerCase().includes(term) ||
        code.label.toLowerCase().includes(term)
    ).slice(0, 10)
  }, [searchTerm])

  const filteredIcd9 = useMemo(() => {
    if (!searchTerm) return ICD9_CODES.slice(0, 10)

    const term = searchTerm.toLowerCase()
    return ICD9_CODES.filter(
      (code) =>
        code.code.toLowerCase().includes(term) ||
        code.label.toLowerCase().includes(term)
    ).slice(0, 10)
  }, [searchTerm])

  const handleIcd10Toggle = (code: IcdCode) => {
    const isSelected = selectedIcd10Codes.some((c) => c.code === code.code)
    let newCodes: IcdCode[]

    if (isSelected) {
      newCodes = selectedIcd10Codes.filter((c) => c.code !== code.code)
    } else {
      if (selectedIcd10Codes.length >= maxSelections) return
      newCodes = [...selectedIcd10Codes, { ...code, confidence: 0.9 }]
    }

    onIcd10Select?.(newCodes)
  }

  const handleIcd9Toggle = (code: IcdCode) => {
    const isSelected = selectedIcd9Codes.some((c) => c.code === code.code)
    let newCodes: IcdCode[]

    if (isSelected) {
      newCodes = selectedIcd9Codes.filter((c) => c.code !== code.code)
    } else {
      if (selectedIcd9Codes.length >= maxSelections) return
      newCodes = [...selectedIcd9Codes, { ...code, confidence: 0.9 }]
    }

    onIcd9Select?.(newCodes)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-500" />
          <CardTitle>Smart Coding ICD</CardTitle>
        </div>
        <CardDescription>
          Cari dan pilih kode ICD yang relevan untuk diagnosa dan prosedur
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs for ICD-10 and ICD-9 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'icd10' | 'icd9')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="icd10" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              ICD-10
              {selectedIcd10Codes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedIcd10Codes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="icd9" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              ICD-9-CM
              {selectedIcd9Codes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedIcd9Codes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="icd10" className="space-y-3 mt-4">
            {filteredIcd10.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada kode ICD-10 yang cocok
              </p>
            ) : (
              filteredIcd10.map((code) => {
                const isSelected = selectedIcd10Codes.some((c) => c.code === code.code)
                return (
                  <div
                    key={code.code}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                    onClick={() => handleIcd10Toggle(code)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {code.code}
                        </Badge>
                        <span className={cn('text-sm', isSelected && 'font-medium')}>
                          {code.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                      {selectedIcd10Codes.length >= maxSelections && !isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Penuh
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="icd9" className="space-y-3 mt-4">
            {filteredIcd9.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada kode ICD-9-CM yang cocok
              </p>
            ) : (
              filteredIcd9.map((code) => {
                const isSelected = selectedIcd9Codes.some((c) => c.code === code.code)
                return (
                  <div
                    key={code.code}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-green-50 border-green-300'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                    onClick={() => handleIcd9Toggle(code)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {code.code}
                        </Badge>
                        <span className={cn('text-sm', isSelected && 'font-medium')}>
                          {code.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {selectedIcd9Codes.length >= maxSelections && !isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Penuh
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Codes Summary */}
        {(selectedIcd10Codes.length > 0 || selectedIcd9Codes.length > 0) && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Kode Terpilih</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onIcd10Select?.([])
                  onIcd9Select?.([])
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Hapus Semua
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedIcd10Codes.map((code) => (
                <Badge
                  key={`selected-icd10-${code.code}`}
                  variant="secondary"
                  className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  <span className="font-mono text-xs mr-1">{code.code}</span>
                  <span className="text-xs">{code.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleIcd10Toggle(code)
                    }}
                    className="ml-1 rounded-full hover:bg-blue-300 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedIcd9Codes.map((code) => (
                <Badge
                  key={`selected-icd9-${code.code}`}
                  variant="secondary"
                  className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200"
                >
                  <span className="font-mono text-xs mr-1">{code.code}</span>
                  <span className="text-xs">{code.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleIcd9Toggle(code)
                    }}
                    className="ml-1 rounded-full hover:bg-green-300 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Maksimum {maxSelections} kode per kategori. Klik kode untuk menambahkan atau menghapus.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}