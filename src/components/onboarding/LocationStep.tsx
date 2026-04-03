import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, Loader2 } from "lucide-react";

interface Props {
  initialData: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
  clinicId: string | null;
}

const INDONESIAN_PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan",
  "Bengkulu", "Lampung", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta",
  "Jawa Timur", "Banten", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur",
  "Kalimantan Utara", "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan",
  "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat", "Maluku", "Maluku Utara",
  "Papua", "Papua Barat", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya"
];

export const LocationStep = ({ initialData, onSubmit, isSaving }: Props) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialData?.searchQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    latitude: initialData?.latitude || '',
    longitude: initialData?.longitude || '',
    province: initialData?.province || '',
    city: initialData?.city || '',
    district: initialData?.district || '',
    sub_district: initialData?.sub_district || '',
    full_address: initialData?.full_address || '',
    postal_code: initialData?.postal_code || '',
    google_maps_url: initialData?.google_maps_url || '',
  });

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Indonesia')}&format=json&countrycodes=id&limit=5`,
        { headers: { 'User-Agent': 'DentiCarePro/1.0' } }
      );
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast({ title: "Tidak ada hasil", description: "Coba kata kunci lain.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal mencari", description: "Cek koneksi internet.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const selectAddress = (result: any) => {
    const addr = result.display_name.split(', ');
    setFormData(prev => ({
      ...prev,
      latitude: parseFloat(result.lat).toFixed(6),
      longitude: parseFloat(result.lon).toFixed(6),
      full_address: result.display_name,
      // Try to parse city and province from display name
      city: addr[1] || '',
      province: addr[addr.length - 3] || '',
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_address) {
      toast({ title: "Alamat wajib diisi", description: "Gunakan pencarian untuk menemukan lokasi.", variant: "destructive" });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Address Search */}
      <div className="space-y-2">
        <Label className="font-semibold text-on-surface">Cari Lokasi</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-on-surface-variant" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ketik alamat atau nama jalan..."
              className="pl-10 bg-surface-container-low border-none rounded-xl h-12"
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
            />
          </div>
          <Button type="button" variant="medical" onClick={searchAddress} disabled={isSearching}>
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari'}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="rounded-xl border border-outline-variant/20 overflow-hidden bg-surface-container-lowest">
            {searchResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectAddress(r)}
                className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span className="text-sm text-on-surface">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Coordinates */}
        {(formData.latitude && formData.longitude) && (
          <div className="rounded-xl bg-primary-container/20 p-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm text-on-primary-container font-mono">
              {formData.latitude}, {formData.longitude}
            </span>
          </div>
        )}
      </div>

      {/* Province */}
      <div className="space-y-2">
        <Label htmlFor="province" className="font-semibold text-on-surface">Provinsi</Label>
        <select
          id="province"
          value={formData.province}
          onChange={e => setFormData(prev => ({ ...prev, province: e.target.value }))}
          className="w-full h-12 px-4 rounded-xl bg-surface-container-low border-none text-on-surface focus:ring-2 focus:ring-primary appearance-none"
        >
          <option value="">Pilih Provinsi</option>
          {INDONESIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label htmlFor="city" className="font-semibold text-on-surface">Kota / Kabupaten</Label>
        <Input
          id="city"
          value={formData.city}
          onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
          placeholder="Contoh: Jakarta Selatan"
          className="bg-surface-container-low border-none rounded-xl h-12"
        />
      </div>

      {/* District & Sub-district */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="district" className="font-semibold text-on-surface">Kecamatan</Label>
          <Input
            id="district"
            value={formData.district}
            onChange={e => setFormData(prev => ({ ...prev, district: e.target.value }))}
            placeholder="Kecamatan"
            className="bg-surface-container-low border-none rounded-xl h-12"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub_district" className="font-semibold text-on-surface">Kelurahan</Label>
          <Input
            id="sub_district"
            value={formData.sub_district}
            onChange={e => setFormData(prev => ({ ...prev, sub_district: e.target.value }))}
            placeholder="Kelurahan"
            className="bg-surface-container-low border-none rounded-xl h-12"
          />
        </div>
      </div>

      {/* Full Address */}
      <div className="space-y-2">
        <Label htmlFor="full_address" className="font-semibold text-on-surface">Alamat Lengkap</Label>
        <textarea
          id="full_address"
          value={formData.full_address}
          onChange={e => setFormData(prev => ({ ...prev, full_address: e.target.value }))}
          placeholder="Nama jalan, nomor bangunan, lantai, unit..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-surface-container-low border-none text-on-surface focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Postal Code */}
      <div className="space-y-2">
        <Label htmlFor="postal_code" className="font-semibold text-on-surface">Kode Pos</Label>
        <Input
          id="postal_code"
          value={formData.postal_code}
          onChange={e => setFormData(prev => ({ ...prev, postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
          placeholder="5 digit"
          maxLength={5}
          className="bg-surface-container-low border-none rounded-xl h-12 max-w-[120px]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => onSubmit(formData)} disabled={isSaving}>
          Lanjut Tanpa Alamat
        </Button>
        <Button type="submit" variant="medical" disabled={isSaving} className="gap-2 min-w-[140px]">
          {isSaving ? 'Menyimpan...' : 'Lanjut'}
        </Button>
      </div>
    </form>
  );
};
