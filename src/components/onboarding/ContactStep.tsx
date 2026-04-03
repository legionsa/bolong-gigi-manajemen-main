import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, Globe, Instagram } from "lucide-react";

interface Props {
  initialData: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
}

export const ContactStep = ({ initialData, onSubmit, isSaving }: Props) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    whatsapp: initialData?.whatsapp || '',
    website: initialData?.website || '',
    instagram_handle: initialData?.instagram_handle || '',
    google_maps_url: initialData?.google_maps_url || '',
  });

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('62')) return `+${digits}`;
    if (digits.startsWith('0')) return `+62${digits.slice(1)}`;
    return digits;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone) {
      toast({ title: "Email dan No. Telepon wajib diisi", variant: "destructive" });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-xl bg-secondary-container/20 p-4 flex items-start gap-3">
        <MessageCircle className="w-5 h-5 text-on-secondary-container flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-on-secondary-container">Nomor WhatsApp</p>
          <p className="text-xs text-on-secondary-container mt-1">
            Nomor ini akan digunakan untuk mengirim reminder dan menerima balasan konfirmasi dari pasien.
          </p>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="font-semibold text-on-surface flex items-center gap-2">
          <Mail className="w-4 h-4 text-on-surface-variant" />
          Email Klinik <span className="text-error">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="info@klinikkamu.com"
          className="bg-surface-container-low border-none rounded-xl h-12"
          required
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="font-semibold text-on-surface flex items-center gap-2">
          <Phone className="w-4 h-4 text-on-surface-variant" />
          No. Telepon Klinik <span className="text-error">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={e => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
          placeholder="+6281234567890"
          className="bg-surface-container-low border-none rounded-xl h-12 font-mono"
          required
        />
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp" className="font-semibold text-on-surface flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-on-surface-variant" />
          WhatsApp
        </Label>
        <Input
          id="whatsapp"
          type="tel"
          value={formData.whatsapp}
          onChange={e => setFormData(prev => ({ ...prev, whatsapp: formatPhone(e.target.value) }))}
          placeholder="+6281234567890"
          className="bg-surface-container-low border-none rounded-xl h-12 font-mono"
        />
        <p className="text-xs text-on-surface-variant">
          Kosongkan jika sama dengan nomor telepon.
        </p>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website" className="font-semibold text-on-surface flex items-center gap-2">
          <Globe className="w-4 h-4 text-on-surface-variant" />
          Website
        </Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
          placeholder="https://klinikkamu.com"
          className="bg-surface-container-low border-none rounded-xl h-12"
        />
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label htmlFor="instagram" className="font-semibold text-on-surface flex items-center gap-2">
          <Instagram className="w-4 h-4 text-on-surface-variant" />
          Instagram
        </Label>
        <Input
          id="instagram"
          value={formData.instagram_handle}
          onChange={e => setFormData(prev => ({ ...prev, instagram_handle: e.target.value.replace('@', '') }))}
          placeholder="namahandle"
          className="bg-surface-container-low border-none rounded-xl h-12"
        />
      </div>

      {/* Google Maps URL */}
      <div className="space-y-2">
        <Label htmlFor="gmap_url" className="font-semibold text-on-surface flex items-center gap-2">
          <Globe className="w-4 h-4 text-on-surface-variant" />
          Google Maps URL
        </Label>
        <Input
          id="gmap_url"
          type="url"
          value={formData.google_maps_url}
          onChange={e => setFormData(prev => ({ ...prev, google_maps_url: e.target.value }))}
          placeholder="https://maps.app.goo.gl/..."
          className="bg-surface-container-low border-none rounded-xl h-12"
        />
        <p className="text-xs text-on-surface-variant">
          Dari Google Maps → Share → Copy Link.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="medical" disabled={isSaving} className="gap-2 min-w-[140px]">
          {isSaving ? 'Menyimpan...' : 'Lanjut'}
        </Button>
      </div>
    </form>
  );
};
