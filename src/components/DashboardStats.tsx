
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, FileText } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useInvoices } from "@/hooks/useInvoices";
import { useMedicalRecords } from "@/hooks/useMedicalRecords";
import { isToday, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardStats = () => {
  const { patients, isLoading: isLoadingPatients } = usePatients();
  const { appointments, isLoading: isLoadingAppointments } = useAppointments();
  const { invoices, isLoading: isLoadingInvoices } = useInvoices();
  const { data: allMedicalRecords, isLoading: isLoadingMedicalRecords } = useMedicalRecords(null);

  const isLoading = isLoadingPatients || isLoadingAppointments || isLoadingInvoices || isLoadingMedicalRecords;

  const totalPatients = patients?.length ?? 0;
  const todayAppointmentsCount = appointments?.filter(appt => isToday(new Date(appt.appointment_date_time))).length ?? 0;
  
  // Calculate monthly revenue from paid invoices
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const monthlyRevenue = invoices?.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at);
    return invoiceDate >= monthStart && invoiceDate <= monthEnd && invoice.payment_status === 'paid';
  }).reduce((total, invoice) => total + (invoice.total_amount || 0), 0) ?? 0;

  // Count active medical records (records from this year)
  const currentYear = new Date().getFullYear();
  const activeMedicalRecords = allMedicalRecords?.filter(record => {
    const recordYear = new Date(record.visit_date).getFullYear();
    return recordYear === currentYear;
  }).length ?? 0;

  const stats = [
    {
      title: "Total Pasien",
      value: totalPatients.toString(),
      description: "Total pasien terdaftar",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Jadwal Hari Ini",
      value: todayAppointmentsCount.toString(),
      description: "Jumlah jadwal untuk hari ini",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Pendapatan Bulan Ini",
      value: `Rp ${monthlyRevenue.toLocaleString()}`,
      description: "Total pembayaran bulan ini",
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      title: "Rekam Medis Aktif",
      value: activeMedicalRecords.toString(),
      description: "Rekam medis tahun ini",
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((statData, index) => {
           const Icon = stats[index].icon;
           return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <div className={`w-8 h-8 ${stats[index].bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stats[index].color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
           )
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <CardDescription className="text-xs">
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;
