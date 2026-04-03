import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, MapPin, User, Clock, Phone, Mail, Edit2,
  CheckCircle2, ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  stepData: Record<string, any>;
  clinic: any;
  onBack: () => void;
  onFinalize: () => void;
  isFinalizing: boolean;
}

const CLINIC_TYPE_LABELS: Record<string, string> = {
  general_dental: 'Klinik Gigi Umum',
  specialist_dental: 'Klinik Gigi Spesialis',
  polyclinic: 'Poliklinik',
  dental_hospital: 'Rumah Sakit Gigi',
};

export const ReviewStep = ({ stepData, clinic, onBack, onFinalize, isFinalizing }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [agreedPDP, setAgreedPDP] = useState(false);

  const step1 = stepData.step_1 || {};
  const step2 = stepData.step_2 || {};
  const step3 = stepData.step_3 || {};
  const step4 = stepData.step_4 || {};
  const step5 = stepData.step_5 || {};

  const days = [0, 1, 2, 3, 4, 5, 6];
  const DAY_LABELS: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="space-y-3">
        {/* Clinic Identity */}
        <Card className="bg-surface-container-low border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-on-secondary-fixed" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">{step1.name || clinic?.name}</p>
                  <p className="text-xs text-on-surface-variant">{CLINIC_TYPE_LABELS[step1.type] || 'Klinik Gigi'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        {(step2.full_address || step2.city) && (
          <Card className="bg-surface-container-low border-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Lokasi</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {[step2.full_address, step2.city, step2.province].filter(Boolean).join(', ')}
                  </p>
                  {step2.latitude && step2.longitude && (
                    <p className="text-[10px] text-on-surface-variant font-mono mt-1">
                      {step2.latitude}, {step2.longitude}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Head of Clinic */}
        {(step3.head_name || step3.head_title) && (
          <Card className="bg-surface-container-low border-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">{step3.head_title} {step3.head_name}</p>
                  {step3.str_number && (
                    <p className="text-xs text-on-surface-variant font-mono mt-1">
                      STR: {step3.str_number}
                      {step3.str_expiry_date && ` • Exp: ${step3.str_expiry_date}`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operating Hours */}
        {step4.days && (
          <Card className="bg-surface-container-low border-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface mb-2">Jadwal Operasional</p>
                  <div className="space-y-1">
                    {days.map(day => {
                      const d = step4.days?.[day];
                      if (!d) return null;
                      return (
                        <div key={day} className="flex justify-between text-xs">
                          <span className="text-on-surface-variant w-16">{DAY_LABELS[day]}</span>
                          <span className={`font-medium ${d.is_open ? 'text-on-surface' : 'text-error'}`}>
                            {d.is_open ? `${d.open_time} - ${d.close_time}` : 'Tutup'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact */}
        {(step5.email || step5.phone) && (
          <Card className="bg-surface-container-low border-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Kontak</p>
                  <p className="text-xs text-on-surface-variant mt-1 space-y-0.5">
                    {step5.email && <span>{step5.email}</span>}
                    {step5.phone && <span className="font-mono block">{step5.phone}</span>}
                    {step5.whatsapp && <span className="text-primary">WhatsApp: {step5.whatsapp}</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Agreements */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
            agreed ? 'bg-primary border-primary' : 'border-outline'
          }`}>
            {agreed && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
          <span className="text-sm text-on-surface">
            Saya确认 bahwa semua informasi di atas adalah akurat.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
            agreedPDP ? 'bg-primary border-primary' : 'border-outline'
          }`}>
            {agreedPDP && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <input type="checkbox" checked={agreedPDP} onChange={e => setAgreedPDP(e.target.checked)} className="sr-only" />
          <span className="text-sm text-on-surface">
            Saya menyetujui <span className="text-primary font-semibold">Perjanjian Pemrosesan Data</span> untuk penanganan data pasien sesuai UU PDP.
          </span>
        </label>
      </div>

      {/* Compliance Note */}
      <div className="rounded-xl bg-tertiary-container/20 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-on-tertiary-container flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-on-tertiary-container">Kepatuhan Regulasi</p>
          <p className="text-xs text-on-tertiary-container mt-1">
            Klinik Anda akan siap beroperasi sesuai <strong>Permenkes No. 24/2022</strong> tentang Rekam Medis dan regulasi BPJS Kesehatan.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2 gap-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button
          variant="medical"
          disabled={!agreed || !agreedPDP || isFinalizing}
          onClick={onFinalize}
          className="gap-2 min-w-[200px] text-base"
        >
          {isFinalizing ? (
            'Memproses...'
          ) : (
            <>
              🚀 Launch Klinik Saya
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
