import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, AlertTriangle } from "lucide-react";

interface Props {
  initialData: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
}

const TITLES = [
  { value: 'drg.', label: 'drg. (Dokter Gigi)' },
  { value: 'dr.', label: 'dr. (Dokter)' },
  { value: 'Dr.', label: 'Dr. (Gelar Doktor)' },
  { value: 'Prof. Dr.', label: 'Prof. Dr.' },
  { value: 'drg. Sp.KG', label: 'drg. Sp.KG (Spesialis Konservasi Gigi)' },
  { value: 'drg. Sp.BM', label: 'drg. Sp.BM (Spesialis Bedah Mulut)' },
  { value: 'drg. Sp.Perio', label: 'drg. Sp.Perio (Spesialis Periodonsia)' },
  { value: 'drg. Sp.Ort', label: 'drg. Sp.Ort (Spesialis Ortodonti)' },
  { value: 'drg. Sp.Pros', label: 'drg. Sp.Pros (Spesialis Prostodonsia)' },
  { value: 'drg. Sp.RKG', label: 'drg. Sp.RKG (Spesialis Rehabilitasi Kegunaan)' },
];

export const HeadOfClinicStep = ({ initialData, onSubmit, isSaving }: Props) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    head_title: initialData?.head_title || '',
    head_name: initialData?.head_name || '',
    str_number: initialData?.str_number || '',
    str_expiry_date: initialData?.str_expiry_date || '',
    sip_number: initialData?.sip_number || '',
    sip_expiry_date: initialData?.sip_expiry_date || '',
  });

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.head_name || !formData.head_title) {
      toast({ title: "Nama dan Titel wajib diisi", variant: "destructive" });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-xl bg-tertiary-container/20 p-4 flex items-start gap-3">
        <User className="w-5 h-5 text-on-tertiary-container flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-on-tertiary-container">Kepala Klinik</p>
          <p className="text-xs text-on-tertiary-container mt-1">
            Wajib diisi sesuai Permenkes. Data STR akan diverifikasi oleh tim kami dalam 24 jam.
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="head_title" className="font-semibold text-on-surface">
          Titel <span className="text-error">*</span>
        </Label>
        <select
          id="head_title"
          value={formData.head_title}
          onChange={e => setFormData(prev => ({ ...prev, head_title: e.target.value }))}
          className="w-full h-12 px-4 rounded-xl bg-surface-container-low border-none text-on-surface focus:ring-2 focus:ring-primary appearance-none"
          required
        >
          <option value="">Pilih Titel</option>
          {TITLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="head_name" className="font-semibold text-on-surface">
          Nama Lengkap <span className="text-error">*</span>
        </Label>
        <Input
          id="head_name"
          value={formData.head_name}
          onChange={e => setFormData(prev => ({ ...prev, head_name: e.target.value }))}
          placeholder="Sesuai STR"
          className="bg-surface-container-low border-none rounded-xl h-12"
          required
        />
      </div>

      {/* STR Number */}
      <div className="space-y-2">
        <Label htmlFor="str_number" className="font-semibold text-on-surface">
          Nomor STR <span className="text-error">*</span>
        </Label>
        <Input
          id="str_number"
          value={formData.str_number}
          onChange={e => setFormData(prev => ({ ...prev, str_number: e.target.value }))}
          placeholder="Format: 12.34.5.67.890123"
          className="bg-surface-container-low border-none rounded-xl h-12 font-mono"
          required
        />
        <p className="text-xs text-on-surface-variant">
          Nomor Surat Tanda Registrasi dari Konsil Kedokteran Indonesia (KKI).
        </p>
      </div>

      {/* STR Expiry */}
      <div className="space-y-2">
        <Label htmlFor="str_expiry_date" className="font-semibold text-on-surface">
          Tanggal Kadaluarsa STR
        </Label>
        <Input
          id="str_expiry_date"
          type="date"
          value={formData.str_expiry_date}
          onChange={e => setFormData(prev => ({ ...prev, str_expiry_date: e.target.value }))}
          className={`bg-surface-container-low border-none rounded-xl h-12 max-w-[200px] ${
            isExpiringSoon(formData.str_expiry_date) ? 'ring-2 ring-yellow-500' : ''
          }`}
        />
        {isExpiringSoon(formData.str_expiry_date) && (
          <div className="flex items-center gap-2 text-yellow-600 text-xs">
            <AlertTriangle className="w-3 h-3" />
            STR akan kadaluarsa dalam 90 hari — pastikan perpanjang tepat waktu.
          </div>
        )}
      </div>

      {/* SIP Number (Optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sip_number" className="font-semibold text-on-surface">
            Nomor SIP
          </Label>
          <Input
            id="sip_number"
            value={formData.sip_number}
            onChange={e => setFormData(prev => ({ ...prev, sip_number: e.target.value }))}
            placeholder="Opsional"
            className="bg-surface-container-low border-none rounded-xl h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sip_expiry_date" className="font-semibold text-on-surface">
            Tanggal Kadaluarsa SIP
          </Label>
          <Input
            id="sip_expiry_date"
            type="date"
            value={formData.sip_expiry_date}
            onChange={e => setFormData(prev => ({ ...prev, sip_expiry_date: e.target.value }))}
            className="bg-surface-container-low border-none rounded-xl h-12"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="medical" disabled={isSaving} className="gap-2 min-w-[140px]">
          {isSaving ? 'Menyimpan...' : 'Lanjut'}
        </Button>
      </div>
    </form>
  );
};
