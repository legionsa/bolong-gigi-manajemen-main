import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus, Receipt, RefreshCw, ArrowRight } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { useInvoices } from '@/hooks/useInvoices';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatientForm } from '@/components/patient/PatientForm';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Build activity feed from real data
function useActivityFeed() {
  const { patients, isLoading: lpat } = usePatients();
  const { appointments, isLoading: lappt } = useAppointments();
  const { invoices, isLoading: linv } = useInvoices();

  const isLoading = lpat || lappt || linv;

  const items: Array<{
    id: string;
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    sub: string;
    time: Date;
  }> = [];

  // Recent patients (up to 2)
  patients
    ?.slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2)
    .forEach(p => {
      items.push({
        id: `pat-${p.id}`,
        icon: UserPlus,
        iconBg: 'bg-primary-fixed',
        iconColor: 'text-primary',
        title: 'Pasien baru didaftarkan',
        sub: p.full_name,
        time: new Date(p.created_at),
      });
    });

  // Recent paid invoices (up to 2)
  invoices
    ?.filter(inv => inv.payment_status === 'paid')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2)
    .forEach(inv => {
      items.push({
        id: `inv-${inv.id}`,
        icon: Receipt,
        iconBg: 'bg-secondary-fixed',
        iconColor: 'text-on-secondary-fixed',
        title: `Invoice #${String(inv.id).slice(-4).toUpperCase()} Dibayar`,
        sub: `Rp ${Number(inv.total_amount).toLocaleString()} diproses`,
        time: new Date(inv.created_at),
      });
    });

  // Most recent appointment as "schedule activity" (up to 1)
  appointments
    ?.slice()
    .sort((a, b) => new Date(b.created_at ?? b.appointment_date_time).getTime() - new Date(a.created_at ?? a.appointment_date_time).getTime())
    .slice(0, 1)
    .forEach(appt => {
      items.push({
        id: `appt-${appt.id}`,
        icon: RefreshCw,
        iconBg: 'bg-tertiary-fixed',
        iconColor: 'text-on-tertiary-fixed',
        title: 'Jadwal diperbarui',
        sub: `${appt.patient_name} — ${format(new Date(appt.appointment_date_time), 'dd MMM, HH:mm', { locale: id })}`,
        time: new Date(appt.created_at ?? appt.appointment_date_time),
      });
    });

  // Sort all items by time desc
  items.sort((a, b) => b.time.getTime() - a.time.getTime());

  return { feed: items.slice(0, 5), isLoading };
}

export const RecentPulse = () => {
  const { feed, isLoading } = useActivityFeed();
  const [showAddPatient, setShowAddPatient] = useState(false);

  return (
    <>
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h3 id="recent-pulse-title" className="text-2xl font-extrabold text-primary font-headline">
            Recent Pulse
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-primary font-bold text-xs"
            onClick={() => setShowAddPatient(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Pasien Baru
          </Button>
        </div>

        {/* Feed card */}
        <div className="bg-surface-container-low rounded-3xl p-6 shadow-sm space-y-6">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </>
          ) : feed.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Belum ada aktivitas. Tenang — senyum pertama belum terlambat.
            </p>
          ) : (
            <ul role="list" aria-label="Aktivitas terkini">
              {feed.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    className={cn('flex gap-4', i < feed.length - 1 && 'pb-6 border-b border-outline-variant/10')}
                    aria-label={`${item.title}: ${item.sub}, ${formatDistanceToNow(item.time, { locale: id, addSuffix: true })}`}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center',
                        item.iconBg
                      )}
                      aria-hidden="true"
                    >
                      <Icon className={cn('w-4 h-4', item.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.sub}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-1.5 uppercase tracking-wider">
                        {formatDistanceToNow(item.time, { locale: id, addSuffix: true })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* See all */}
          {!isLoading && feed.length > 0 && (
            <div className="pt-4 border-t border-outline-variant/10 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] font-black text-primary tracking-widest uppercase hover:bg-transparent hover:text-primary-container gap-1"
                asChild
              >
                <a href="/dashboard?tab=patients">
                  Lihat Semua Aktivitas
                  <ArrowRight className="w-3 h-3" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add patient dialog */}
      <Dialog open={showAddPatient} onOpenChange={setShowAddPatient}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Pasien Baru</DialogTitle>
          </DialogHeader>
          <PatientForm
            onSubmit={async (data) => {
              console.log('New patient data:', data);
              setShowAddPatient(false);
            }}
            initialData={null}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

// Keep backward compat export for Dashboard.tsx
export const RecentPatients = RecentPulse;
export default RecentPulse;
