import { useState } from 'react';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { usePatients } from '@/hooks/usePatients';
import { useNotaKwitansi } from '@/hooks/useNotaKwitansi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Printer, Send } from 'lucide-react';
import { NotaKwitansiPrint } from './NotaKwitansiPrint';

export const NotaKwitansiCreate = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { settings } = useClinicSettings();
  const { patients } = usePatients();
  const { createNota, isCreating } = useNotaKwitansi();
  const { toast } = useToast();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [form, setForm] = useState({
    invoice_number: '',
    amount_total: 0,
    amount_discount: 0,
    amount_final: 0,
    payment_method: 'Tunai',
    notes: '',
  });
  const [savedNota, setSavedNota] = useState<any>(null);
  const [mode, setMode] = useState<'create' | 'preview'>('create');

  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);

  const handleAmountChange = (field: 'amount_total' | 'amount_discount') => {
    const total = field === 'amount_total' ? Number(form.amount_total) : Number(form.amount_total);
    const discount = field === 'amount_discount' ? Number(form.amount_discount) : Number(form.amount_discount);
    const final = Math.max(0, total - discount);
    setForm((f) => ({ ...f, [field]: f[field], amount_final: final }));
  };

  const handleTotalChange = (val: number) => {
    setForm((f) => ({
      ...f,
      amount_total: val,
      amount_final: Math.max(0, val - f.amount_discount),
    }));
  };

  const handleDiscountChange = (val: number) => {
    setForm((f) => ({
      ...f,
      amount_discount: val,
      amount_final: Math.max(0, f.amount_total - val),
    }));
  };

  const handleSave = async () => {
    if (!selectedPatientId || form.amount_total <= 0) {
      toast({ title: 'Lengkapi data', description: 'Pilih pasien dan masukkan jumlah', variant: 'destructive' });
      return;
    }
    try {
      const nota = await createNota({
        patient_id: selectedPatientId,
        invoice_number: form.invoice_number || `NOTA-${Date.now()}`,
        amount_total: form.amount_total,
        amount_discount: form.amount_discount,
        amount_final: form.amount_final,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      setSavedNota(nota);
      setMode('preview');
      toast({ title: 'Nota disimpan', description: 'Nota siap dicetak' });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedPatient?.email) {
      toast({ title: 'Email tidak tersedia', description: 'Pasien tidak memiliki email', variant: 'destructive' });
      return;
    }
    toast({ title: 'Mengirim...', description: 'Fitur kirim email nota sedang dalam pengembangan' });
  };

  if (mode === 'preview' && savedNota) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Nota / Kwitansi — Cetak</h3>
          <Button variant="outline" onClick={() => setMode('create')}>Edit</Button>
        </div>
        <NotaKwitansiPrint nota={savedNota} settings={settings || {}} />
      </div>
    );
  }

  const patientOptions = patients?.map((p) => ({
    value: p.id,
    label: `${p.full_name} — ${p.phone_number || p.nik || '-'}`,
  })) || [];

  return (
    <Card className="bg-[hsl(0,0%,100%)]">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Buat Nota / Kwitansi Baru</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-bold">Pilih Pasien</Label>
          <select
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">-- Pilih Pasien --</option>
            {patientOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Nomor Nota (Opsional)</Label>
          <Input
            value={form.invoice_number}
            onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
            placeholder="Auto-generated jika kosong"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold">Total (Rp)</Label>
            <Input
              type="number"
              min="0"
              value={form.amount_total}
              onChange={(e) => handleTotalChange(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Diskon (Rp)</Label>
            <Input
              type="number"
              min="0"
              value={form.amount_discount}
              onChange={(e) => handleDiscountChange(Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-low p-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Jumlah Akhir</span>
            <span className="font-black text-2xl text-primary">
              Rp {(form.amount_final || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Metode Pembayaran</Label>
          <select
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm"
            value={form.payment_method}
            onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
          >
            <option value="Tunai">Tunai</option>
            <option value="Debit">Debit</option>
            <option value="QRIS">QRIS</option>
            <option value="Transfer">Transfer</option>
            <option value="BPJS">BPJS</option>
            <option value="Asuransi">Asuransi</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="font-bold">Catatan (Opsional)</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Catatan tambahan..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="medical"
            onClick={handleSave}
            disabled={isCreating || !selectedPatientId}
            className="gap-2"
          >
            {isCreating ? 'Menyimpan...' : <><Printer className="w-4 h-4" /> Simpan & Cetak</>}
          </Button>
          {selectedPatient?.email && (
            <Button
              variant="outline"
              onClick={handleSendEmail}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Kirim Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
