import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Building2 } from "lucide-react";

interface Props {
  initialData: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
}

const CLINIC_TYPES = [
  { value: 'general_dental', label: 'Klinik Gigi Umum' },
  { value: 'specialist_dental', label: 'Klinik Gigi Spesialis' },
  { value: 'polyclinic', label: 'Poliklinik' },
  { value: 'dental_hospital', label: 'Rumah Sakit Gigi' },
];

export const ClinicIdentityStep = ({ initialData, onSubmit, isSaving }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || 'general_dental');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(initialData?.logo_url || '');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File terlalu besar", description: "Maksimal 2MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nama Klinik wajib diisi", variant: "destructive" });
      return;
    }
    onSubmit({ name: name.trim(), type, logo_url: logoPreview });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Clinic Name */}
      <div className="space-y-2">
        <Label htmlFor="clinicName" className="font-semibold text-on-surface">
          Nama Klinik <span className="text-error">*</span>
        </Label>
        <Input
          id="clinicName"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contoh: Klinik Gigi Sehat Abadi"
          className="bg-surface-container-low border-none focus-visible:ring-primary rounded-xl h-12 text-on-surface"
          required
        />
        <p className="text-xs text-on-surface-variant">
          Nama ini akan muncul di invoice, reminder, dan portal pasien.
        </p>
      </div>

      {/* Clinic Type */}
      <div className="space-y-3">
        <Label className="font-semibold text-on-surface">
          Jenis Klinik <span className="text-error">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {CLINIC_TYPES.map(ct => (
            <Card
              key={ct.value}
              className={`cursor-pointer transition-all hover:shadow-sm ${
                type === ct.value
                  ? 'border-primary bg-primary-container/20 ring-1 ring-primary'
                  : 'border-outline-variant/20 hover:border-primary/40'
              }`}
              onClick={() => setType(ct.value)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  type === ct.value ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className={`text-sm font-medium ${
                  type === ct.value ? 'text-primary' : 'text-on-surface'
                }`}>
                  {ct.label}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="font-semibold text-on-surface">Logo Klinik</Label>
        <div className="flex items-start gap-4">
          <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
            logoPreview ? 'border-primary/40' : 'border-outline-variant'
          }`}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <Upload className="w-6 h-6 mx-auto text-on-surface-variant mb-1" />
                <span className="text-[10px] text-on-surface-variant">Upload</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span>Pilih File</span>
              </Button>
            </label>
            <p className="text-xs text-on-surface-variant mt-2">
              Format: PNG atau JPG, maksimal 2MB.<br />
             _opsional — dapat ditambahkan nanti.
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {name && (
        <div className="rounded-xl bg-surface-container-low p-4">
          <p className="text-xs text-on-surface-variant mb-2 font-medium">Preview di Invoice:</p>
          <div className="flex items-center gap-3">
            {logoPreview && (
              <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div>
              <p className="font-bold text-on-surface">{name}</p>
              <p className="text-xs text-on-surface-variant">{CLINIC_TYPES.find(t => t.value === type)?.label}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="medical" disabled={isSaving} className="gap-2 min-w-[140px]">
          {isSaving ? 'Menyimpan...' : 'Lanjut'}
        </Button>
      </div>
    </form>
  );
};
