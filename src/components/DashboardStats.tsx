import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, DollarSign, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { isToday, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface StatCard {
  title: string
  value: string
  wittyLabel: string
  subCopy: string
  icon: React.ElementType
  badge?: { text: string; positive: boolean }
  progress?: number
  colorClass: string
  iconBg: string
}

const DashboardStats = () => {
  const { patients, isLoading: isLoadingPatients, error: errorPatients } = usePatients();
  const { appointments, isLoading: isLoadingAppointments, error: errorAppointments } = useAppointments();
  const { invoices, isLoading: isLoadingInvoices, error: errorInvoices } = useInvoices();
  const { data: allMedicalRecords, isLoading: isLoadingMedicalRecords } = useMedicalRecords(null);

  const isLoading = isLoadingPatients || isLoadingAppointments || isLoadingInvoices || isLoadingMedicalRecords;
  const hasError = errorPatients || errorAppointments || errorInvoices;

  const totalPatients = patients?.length ?? 0;
  const todayAppointmentsCount = appointments?.filter(appt =>
    isToday(new Date(appt.appointment_date_time))
  ).length ?? 0;
  const remainingSlots = Math.max(0, 16 - todayAppointmentsCount);

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthlyRevenue = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate >= monthStart && invoiceDate <= monthEnd && invoice.payment_status === 'paid';
  }).reduce((total, invoice) => total + (invoice.total_amount || 0), 0) ?? 0;

  const currentYear = new Date().getFullYear();
  const activeMedicalRecords = allMedicalRecords?.filter(record => {
    const recordYear = new Date(record.visit_date).getFullYear();
    return recordYear === currentYear;
  }).length ?? 0;

  const progressPct = activeMedicalRecords > 0
    ? Math.min(100, Math.round((activeMedicalRecords / Math.max(totalPatients, 1)) * 100))
    : 75;

  const formatRevenue = (val: number) => {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
    if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(0)}Jt`
    if (val >= 1_000)         return `Rp ${(val / 1_000).toFixed(0)}K`
    return `Rp ${val.toLocaleString()}`
  }

  const stats: StatCard[] = [
    {
      title: "Total Pasien",
      value: totalPatients.toLocaleString(),
      wittyLabel: `${totalPatients.toLocaleString()} Pasien`,
      subCopy: "Total pasien terdaftar",
      icon: Users,
      badge: { text: "+12% bulan ini", positive: true },
      colorClass: "text-primary",
      iconBg: "bg-primary-fixed",
    },
    {
      title: "Jadwal Hari Ini",
      value: todayAppointmentsCount.toString(),
      wittyLabel: `${todayAppointmentsCount} Open Wide`,
      subCopy: `${remainingSlots} slot tersisa hari ini`,
      icon: Calendar,
      colorClass: "text-primary",
      iconBg: "bg-secondary-fixed",
    },
    {
      title: "Pendapatan Bulan Ini",
      value: formatRevenue(monthlyRevenue),
      wittyLabel: formatRevenue(monthlyRevenue),
      subCopy: "Sparkling results",
      icon: DollarSign,
      badge: { text: "Bulan berjalan", positive: true },
      colorClass: "text-primary",
      iconBg: "bg-tertiary-fixed",
    },
    {
      title: "Kasus Aktif",
      value: activeMedicalRecords.toString(),
      wittyLabel: `${activeMedicalRecords} Progressing`,
      subCopy: "Rekam medis tahun ini",
      icon: FileText,
      progress: progressPct,
      colorClass: "text-primary",
      iconBg: "bg-primary-fixed",
    },
  ];

  if (hasError) {
    return (
      <Alert variant="destructive" className="mb-4 rounded-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Gagal memuat data:{" "}
          {errorPatients?.message || errorAppointments?.message || errorInvoices?.message || "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-surface-container-lowest border-none shadow-long rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-3 w-24 mb-5" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      role="list"
      aria-label="Statistik klinik"
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            role="listitem"
            className={cn(
              "bg-surface-container-lowest rounded-2xl p-6 shadow-long relative overflow-hidden group",
              "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-long-md",
              "animate-fade-in-up"
            )}
            style={{ animationDelay: `${index * 80}ms` }}
            tabIndex={0}
            aria-label={`${stat.title}: ${stat.wittyLabel}`}
          >
            {/* Content */}
            <div className="relative z-10">
              <p className="text-muted-foreground text-sm font-medium mb-1">{stat.title}</p>

              {/* Witty value */}
              <h3 className={cn("text-2xl md:text-3xl font-extrabold font-headline mt-1 leading-tight", stat.colorClass)}>
                {stat.wittyLabel}
              </h3>

              <div className="mt-4 flex flex-col gap-2">
                {/* Sub copy */}
                <p className="text-xs text-muted-foreground italic">{stat.subCopy}</p>

                {/* Optional badge */}
                {stat.badge && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-xs font-bold",
                      stat.badge.positive
                        ? "bg-primary-fixed/40 text-primary"
                        : "bg-destructive/10 text-destructive"
                    )}
                    aria-label={stat.badge.text}
                  >
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    {stat.badge.text}
                  </div>
                )}

                {/* Optional progress bar */}
                {stat.progress !== undefined && (
                  <div className="mt-1">
                    <div
                      className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={stat.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${stat.progress}% dari target`}
                    >
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-700"
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{stat.progress}% dari total pasien</p>
                  </div>
                )}
              </div>
            </div>

            {/* Background ghost icon — asymmetric, bleeds off right edge */}
            <div
              className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:scale-110 group-hover:opacity-[0.07] transition-all duration-500 pointer-events-none"
              aria-hidden="true"
            >
              <Icon className="w-24 h-24" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
