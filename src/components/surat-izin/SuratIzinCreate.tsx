import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { useAppointments } from '@/hooks/useAppointments';
import { useSuratIzin } from '@/hooks/useSuratIzin';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Search, Printer } from 'lucide-react';
import { SuratIzinPrint } from './SuratIzinPrint';

interface Option {
  value: string;
  label: string;
}

export const SuratIzinCreate = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user } = useAuth();
  const { settings } = useClinicSettings();
  const { appointments } = useAppointments();
  const { createDocument, templates, fetchICD10Codes, isCreating } = useSuratIzin();
  const { toast } = useToast();

  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [icd10Search, setIcd10Search] = useState('');
  const [icd10DropdownOpen, setIcd10DropdownOpen] = useState(false);
  const [icd10Results, setIcd10Results] = useState<any[]>([]);
  const [isSearchingIcd10, setIsSearchingIcd10] = useState(false);

  const [form, setForm] = useState({
    patient_name: '',
    patient_nik: '',
    patient_address: '',
    diagnosis: '',
    icd10_code: '',
    icd10_desc: '',
    letter_date: new Date().toISOString().split('T')[0],
    keperluan: '',
    signature_name: '',
  });

  const [savedDoc, setSavedDoc] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'preview'>('create');

  // Search ICD-10 when user types
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (icd10Search.length >= 2) {
        setIsSearchingIcd10(true);
        try {
          const results = await fetchICD10Codes(icd10Search);
          setIcd10Results(results);
          setIcd10DropdownOpen(true);
        } finally {
          setIsSearchingIcd10(false);
        }
      } else {
        setIcd10Results([]);
        setIcd10DropdownOpen(false);
      }
    }, 300);
    return () => clearTimeout(searchTimer);
  }, [icd10Search, fetchICD10Codes]);

  // Prefill when appointment selected
  const selectedAppointment = appointments?.find((a) => a.id === selectedAppointmentId);
  useEffect(() => {
    if (selectedAppointment) {
      setForm((f) => ({
        ...f,
        patient_name: selectedAppointment.patient_name || '',
        diagnosis: selectedAppointment.notes || selectedAppointment.service_name || '',
      }));
      // Also fetch patient details for nik and address
      if (selectedAppointment.patient_id) {
        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase
            .from('patients')
            .select('nik, address')
            .eq('id', selectedAppointment.patient_id)
            .single()
            .then(({ data }) => {
              if (data) {
                setForm((f) => ({
                  ...f,
                  patient_nik: data.nik || '',
                  patient_address: data.address || '',
                }));
              }
            });
        });
      }
    }
  }, [selectedAppointmentId, selectedAppointment]);

  // Pre-fill signature name with doctor's own name
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setForm((f) => ({ ...f, signature_name: user.user_metadata.full_name }));
    }
  }, [user]);

  const handleIcd10Select = (code: any) => {
    setForm((f) => ({ ...f, icd10_code: code.code, icd10_desc: code.description }));
    setIcd10Search(code.code + ' — ' + code.description);
    setIcd10DropdownOpen(false);
  };

  const handleSave = async () => {
    if (!selectedAppointmentId || !form.patient_name) {
      toast({ title: 'Lengkapi semua field', variant: 'destructive' });
      return;
    }
    try {
      const appointment = appointments?.find((a) => a.id === selectedAppointmentId);
      const doc = await createDocument({
        appointment_id: selectedAppointmentId,
        patient_id: appointment?.patient_id || '',
        doctor_id: user?.id || '',
        template_id: selectedTemplateId || undefined,
        patient_name: form.patient_name,
        patient_nik: form.patient_nik,
        patient_address: form.patient_address,
        diagnosis: form.diagnosis,
        icd10_code: form.icd10_code,
        icd10_desc: form.icd10_desc,
        letter_date: form.letter_date,
        keperluan: form.keperluan,
        signature_name: form.signature_name,
        status: 'draft',
      });
      setSavedDoc(doc);
      setMode('preview');
      toast({ title: 'Surat Izin disimpan', description: 'Surat siap dicetak' });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    }
  };

  if (mode === 'preview' && savedDoc) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Surat Izin — Cetak</h3>
          <Button variant="outline" onClick={() => setMode('create')}>
            Edit Kembali
          </Button>
        </div>
        <SuratIzinPrint
          document={savedDoc}
          appointment={selectedAppointment}
          doctor={user ? { full_name: user.user_metadata?.full_name || '' } : undefined}
          settings={settings || {}}
          template={templates?.find((t) => t.id === savedDoc.template_id)}
        />
      </div>
    );
  }

  const appointmentOptions: Option[] =
    appointments
      ?.map((a) => ({
        value: a.id,
        label: `${a.patient_name} — ${new Date(a.appointment_date_time).toLocaleDateString('id-ID')} (${a.service_name}) [${a.status}]`,
      })) || [];

  return (
    <Card className="bg-[hsl(0,0%,100%)]">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Buat Surat Izin Baru</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Appointment Selection */}
        <div className="space-y-2">
          <Label className="font-bold">Pilih Pasien / Janji Temu</Label>
          <select
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            value={selectedAppointmentId}
            onChange={(e) => {
              setSelectedAppointmentId(e.target.value);
              setSavedDoc(null);
            }}
          >
            <option value="">-- Pilih Janji Temu --</option>
            {appointmentOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold">Nama Pasien</Label>
            <Input
              value={form.patient_name}
              onChange={(e) => setForm((f) => ({ ...f, patient_name: e.target.value }))}
              placeholder="Nama lengkap pasien"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">NIK / No. KTP</Label>
            <Input
              value={form.patient_nik}
              onChange={(e) => setForm((f) => ({ ...f, patient_nik: e.target.value }))}
              placeholder="321xxxxxxxxx"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Alamat Pasien</Label>
          <Input
            value={form.patient_address}
            onChange={(e) => setForm((f) => ({ ...f, patient_address: e.target.value }))}
            placeholder="Alamat lengkap pasien"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Kode ICD-10-CM (Dental)</Label>
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={icd10Search}
                onChange={(e) => {
                  setIcd10Search(e.target.value);
                  setForm((f) => ({ ...f, icd10_code: '', icd10_desc: '' }));
                }}
                onFocus={() => icd10Results.length > 0 && setIcd10DropdownOpen(true)}
                placeholder="Ketik kode atau deskripsi ICD-10..."
                className="pl-10"
              />
              {isSearchingIcd10 && (
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground animate-pulse">
                  Mencari...
                </span>
              )}
            </div>

            {icd10DropdownOpen && icd10Results.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {icd10Results.map((r) => (
                  <li
                    key={r.id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-0"
                    onClick={() => handleIcd10Select(r)}
                  >
                    <span className="font-mono font-bold text-blue-700 mr-2">{r.code}</span>
                    <span className="text-gray-700">{r.description}</span>
                    <br />
                    <span className="text-xs text-gray-400">{r.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {form.icd10_code && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <Check className="w-4 h-4" />
              <span className="font-mono font-bold">{form.icd10_code}</span>
              <span>— {form.icd10_desc}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Diagnosis / Keluhan</Label>
          <Input
            value={form.diagnosis}
            onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
            placeholder="Deskripsi diagnosis atau keluhan"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold">Tanggal Surat</Label>
            <Input
              type="date"
              value={form.letter_date}
              onChange={(e) => setForm((f) => ({ ...f, letter_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Keperluan</Label>
            <Input
              value={form.keperluan}
              onChange={(e) => setForm((f) => ({ ...f, keperluan: e.target.value }))}
              placeholder="Contoh: Untuk keperluan kantor/pabrik"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Nama Dokter (Tanda Tangan)</Label>
          <Input
            value={form.signature_name}
            onChange={(e) => setForm((f) => ({ ...f, signature_name: e.target.value }))}
            placeholder="Ketik nama untuk e-sign"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="medical"
            onClick={handleSave}
            disabled={isCreating || !selectedAppointmentId || !form.patient_name}
            className="gap-2"
          >
            {isCreating ? 'Menyimpan...' : (
              <><Printer className="w-4 h-4" /> Simpan & Cetak</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
