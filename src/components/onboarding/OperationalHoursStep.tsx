import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  initialData: any;
  onSubmit: (data: any) => void;
  isSaving: boolean;
  clinicId: string | null;
}

const DAYS = [
  { id: 1, label: "Senin" },
  { id: 2, label: "Selasa" },
  { id: 3, label: "Rabu" },
  { id: 4, label: "Kamis" },
  { id: 5, label: "Jumat" },
  { id: 6, label: "Sabtu" },
  { id: 0, label: "Minggu" },
];

const SLOT_DURATIONS = [
  { value: 15, label: "15 menit" },
  { value: 20, label: "20 menit" },
  { value: 30, label: "30 menit" },
  { value: 45, label: "45 menit" },
  { value: 60, label: "60 menit" },
];

interface DayConfig {
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
}

const defaultDay = (): DayConfig => ({
  is_open: true,
  open_time: '08:00',
  close_time: '17:00',
  break_start: '12:00',
  break_end: '13:00',
});

export const OperationalHoursStep = ({ initialData, onSubmit, isSaving, clinicId }: Props) => {
  const { toast } = useToast();
  const [useSameHours, setUseSameHours] = useState(initialData?.useSameHours ?? true);
  const [commonOpen, setCommonOpen] = useState(initialData?.commonOpen || '08:00');
  const [commonClose, setCommonClose] = useState(initialData?.commonClose || '17:00');
  const [commonBreakStart, setCommonBreakStart] = useState(initialData?.commonBreakStart || '12:00');
  const [commonBreakEnd, setCommonBreakEnd] = useState(initialData?.commonBreakEnd || '13:00');
  const [slotDuration, setSlotDuration] = useState(initialData?.slot_duration_mins || 30);
  const [acceptWalkIn, setAcceptWalkIn] = useState(initialData?.accept_walk_in || false);
  const [days, setDays] = useState<Record<number, DayConfig>>(() => {
    if (initialData?.days) return initialData.days;
    const result: Record<number, DayConfig> = {};
    for (let d of [0, 1, 2, 3, 4, 5, 6]) {
      result[d] = { ...defaultDay(), is_open: d !== 0 };
    }
    return result;
  });

  const applyCommonHours = () => {
    const updated = { ...days };
    for (let d of [1, 2, 3, 4, 5]) {
      updated[d] = {
        is_open: true,
        open_time: commonOpen,
        close_time: commonClose,
        break_start: commonBreakStart,
        break_end: commonBreakEnd,
      };
    }
    updated[6] = {
      is_open: true,
      open_time: commonOpen,
      close_time: '13:00',
      break_start: '',
      break_end: '',
    };
    updated[0] = { is_open: false, open_time: '', close_time: '', break_start: '', break_end: '' };
    setDays(updated);
  };

  useEffect(() => {
    if (useSameHours) {
      applyCommonHours();
    }
  }, [useSameHours, commonOpen, commonClose, commonBreakStart, commonBreakEnd]);

  const toggleDay = (day: number) => {
    setDays(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_open: !prev[day].is_open,
        open_time: prev[day].is_open ? '' : commonOpen,
        close_time: prev[day].is_open ? '' : commonClose,
      },
    }));
  };

  const updateDay = (day: number, field: keyof DayConfig, value: any) => {
    setDays(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    const hasOpenDays = Object.values(days).some(d => d.is_open);
    if (!hasOpenDays) {
      toast({ title: "Setidaknya satu hari harus buka", variant: "destructive" });
      return;
    }

    // Save to database
    setIsSaving(true);
    try {
      const rows = DAYS.map(d => ({
        clinic_id: clinicId,
        day_of_week: d.id,
        is_open: days[d.id]?.is_open ?? false,
        open_time: days[d.id]?.is_open ? (days[d.id]?.open_time || null) : null,
        close_time: days[d.id]?.is_open ? (days[d.id]?.close_time || null) : null,
        break_start: days[d.id]?.is_open ? (days[d.id]?.break_start || null) : null,
        break_end: days[d.id]?.is_open ? (days[d.id]?.break_end || null) : null,
        slot_duration_mins: slotDuration,
        accept_walk_in: acceptWalkIn,
      }));

      await supabase.from('clinic_operating_hours').upsert(rows, { onConflict: 'clinic_id,day_of_week' });

      onSubmit({
        days,
        useSameHours,
        commonOpen,
        commonClose,
        commonBreakStart,
        commonBreakEnd,
        slot_duration_mins: slotDuration,
        accept_walk_in: acceptWalkIn,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Slot Duration */}
      <div className="space-y-2">
        <Label className="font-semibold text-on-surface">Durasi Konsultasi</Label>
        <div className="flex gap-2 flex-wrap">
          {SLOT_DURATIONS.map(sd => (
            <button
              key={sd.value}
              type="button"
              onClick={() => setSlotDuration(sd.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                slotDuration === sd.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              {sd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Walk-in Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
        <div>
          <p className="font-semibold text-on-surface">Terima Walk-In</p>
          <p className="text-xs text-on-surface-variant">Ijinkan booking di luar jam operasional</p>
        </div>
        <button
          type="button"
          onClick={() => setAcceptWalkIn(!acceptWalkIn)}
          className={`w-12 h-7 rounded-full transition-all relative ${
            acceptWalkIn ? 'bg-primary' : 'bg-surface-container-high'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-all absolute top-1 ${
            acceptWalkIn ? 'left-6' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Common Hours Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
        <div>
          <p className="font-semibold text-on-surface">Jam Sama untuk Semua Hari</p>
          <p className="text-xs text-on-surface-variant">Terapkan jam yang sama ke Senin-Jumat</p>
        </div>
        <button
          type="button"
          onClick={() => setUseSameHours(!useSameHours)}
          className={`w-12 h-7 rounded-full transition-all relative ${
            useSameHours ? 'bg-primary' : 'bg-surface-container-high'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-all absolute top-1 ${
            useSameHours ? 'left-6' : 'left-1'
          }`} />
        </button>
      </div>

      {/* Common Hours Inputs */}
      {useSameHours && (
        <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-on-surface mb-3">
            <Clock className="w-4 h-4" />
            Jam Operasional Default
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">Jam Buka</Label>
              <Input type="time" value={commonOpen} onChange={e => setCommonOpen(e.target.value)} className="bg-surface-container-lowest border-none h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">Jam Tutup</Label>
              <Input type="time" value={commonClose} onChange={e => setCommonClose(e.target.value)} className="bg-surface-container-lowest border-none h-10" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">Istirahat Mulai</Label>
              <Input type="time" value={commonBreakStart} onChange={e => setCommonBreakStart(e.target.value)} className="bg-surface-container-lowest border-none h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-on-surface-variant">Istirahat Selesai</Label>
              <Input type="time" value={commonBreakEnd} onChange={e => setCommonBreakEnd(e.target.value)} className="bg-surface-container-lowest border-none h-10" />
            </div>
          </div>
        </div>
      )}

      {/* Per-Day Schedule */}
      <div className="space-y-2">
        <Label className="font-semibold text-on-surface">Jadwal per Hari</Label>
        <div className="space-y-2">
          {DAYS.map(day => (
            <div
              key={day.id}
              className={`rounded-xl border transition-all ${
                days[day.id]?.is_open
                  ? 'border-primary/30 bg-surface-container-low'
                  : 'border-outline-variant/20 bg-surface-container-low/50'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    days[day.id]?.is_open
                      ? 'border-primary bg-primary'
                      : 'border-surface-container-high'
                  }`}
                >
                  {days[day.id]?.is_open && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 ml-3 text-sm font-medium ${
                  days[day.id]?.is_open ? 'text-on-surface' : 'text-on-surface-variant'
                }`}>
                  {day.label}
                </span>
                {days[day.id]?.is_open && (
                  <span className="text-xs text-on-surface-variant">
                    {days[day.id]?.open_time} - {days[day.id]?.close_time}
                  </span>
                )}
                {!days[day.id]?.is_open && (
                  <span className="text-xs text-on-surface-variant">Tutup</span>
                )}
              </div>

              {days[day.id]?.is_open && !useSameHours && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-on-surface-variant">Buka</Label>
                    <Input type="time" size="sm" value={days[day.id]?.open_time || ''} onChange={e => updateDay(day.id, 'open_time', e.target.value)} className="bg-surface-container-lowest border-none h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-on-surface-variant">Tutup</Label>
                    <Input type="time" size="sm" value={days[day.id]?.close_time || ''} onChange={e => updateDay(day.id, 'close_time', e.target.value)} className="bg-surface-container-lowest border-none h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-on-surface-variant">Ist. Mulai</Label>
                    <Input type="time" size="sm" value={days[day.id]?.break_start || ''} onChange={e => updateDay(day.id, 'break_start', e.target.value)} className="bg-surface-container-lowest border-none h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-on-surface-variant">Ist. Selesai</Label>
                    <Input type="time" size="sm" value={days[day.id]?.break_end || ''} onChange={e => updateDay(day.id, 'break_end', e.target.value)} className="bg-surface-container-lowest border-none h-9 text-xs" />
                  </div>
                </div>
              )}
            </div>
          ))}
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
