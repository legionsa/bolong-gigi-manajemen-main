import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileText, CreditCard, User, LogOut, Clock, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PatientSession {
  patient_id: string;
  phone: string;
  login_at: string;
}

interface PatientData {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  address: string | null;
  nik: string | null;
  date_of_birth: string | null;
  gender: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface Appointment {
  id: string;
  appointment_date_time: string;
  service_name: string;
  dentist_name: string;
  status: string;
  notes: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
  service_name: string;
}

const PortalDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<PatientSession | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'invoices' | 'profile'>('appointments');

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const sessionData = localStorage.getItem("patient_portal_session");
      if (!sessionData) {
        navigate("/portal/login");
        return;
      }

      const parsedSession: PatientSession = JSON.parse(sessionData);
      setSession(parsedSession);

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", parsedSession.patient_id)
        .single();

      if (patientError || !patientData) {
        toast({ title: "Error", description: "Data pasien tidak ditemukan", variant: "destructive" });
        navigate("/portal/login");
        return;
      }

      setPatient(patientData);

      // Fetch upcoming appointments
      const { data: appointmentsData } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", parsedSession.patient_id)
        .gte("appointment_date_time", new Date().toISOString())
        .order("appointment_date_time")
        .limit(5);

      setAppointments(appointmentsData || []);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", parsedSession.patient_id)
        .order("created_at", { ascending: false })
        .limit(10);

      setInvoices(invoicesData || []);

    } catch (error) {
      console.error("Load portal data error:", error);
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("patient_portal_session");
    toast({ title: "Logout Berhasil" });
    navigate("/portal/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Dijadwalkan": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "Selesai": return "bg-gray-100 text-gray-800";
      case "Dibatalkan": return "bg-red-100 text-red-800";
      case "Berlangsung": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">🦷</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Patient Portal</h1>
              <p className="text-sm text-gray-500">DentiCare Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Halo, {patient?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-gray-500">Janji Temu Mendatang</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.filter(i => i.payment_status === 'paid').length}</p>
                <p className="text-sm text-gray-500">Invoice Lunas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <CreditCard className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  Rp {(invoices.filter(i => i.payment_status === 'pending').reduce((sum, i) => sum + i.total_amount, 0) || 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Tagihan Tertunda</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{patient?.full_name}</p>
                <p className="text-sm text-gray-500">{patient?.phone_number}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Online Booking CTA */}
        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold mb-1">Booking Janji Temu Online</h3>
                <p className="text-blue-100">Pesan jadwal kunjungan Anda dengan mudah</p>
              </div>
              <Link to="/booking">
                <Button className="bg-white text-blue-700 hover:bg-blue-50">
                  Book Sekarang <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'appointments' ? 'default' : 'outline'}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar className="w-4 h-4 mr-2" />Janji Temu
          </Button>
          <Button
            variant={activeTab === 'records' ? 'default' : 'outline'}
            onClick={() => setActiveTab('records')}
          >
            <FileText className="w-4 h-4 mr-2" />Rekam Medis
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('invoices')}
          >
            <CreditCard className="w-4 h-4 mr-2" />Invoice
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4 mr-2" />Profil
          </Button>
        </div>

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <Card>
            <CardHeader>
              <CardTitle>Janji Temu Saya</CardTitle>
              <CardDescription>Daftar janji temu Anda yang akan datang</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Belum ada janji temu yang terjadwal</p>
                  <Link to="/booking">
                    <Button>Book Janji Temu</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs text-blue-600 font-medium">
                            {format(new Date(appt.appointment_date_time), 'dd')}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {format(new Date(appt.appointment_date_time), 'MMM')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{appt.service_name}</p>
                          <p className="text-sm text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {format(new Date(appt.appointment_date_time), 'HH:mm')}
                            {" - Dr. "}{appt.dentist_name}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appt.status)}>{appt.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <Card>
            <CardHeader>
              <CardTitle>Rekam Medis</CardTitle>
              <CardDescription>Riwayat kunjungan dan perawatan Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Fitur rekam medis akan segera hadir</p>
                <p className="text-sm text-gray-400">Hubungi klinik untuk informasi lebih lanjut</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
              <CardDescription>Daftar tagihan dan pembayaran Anda</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada invoice</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">
                          {invoice.service_name} - {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rp {invoice.total_amount.toLocaleString()}</p>
                        <Badge className={getInvoiceStatusColor(invoice.payment_status)}>
                          {invoice.payment_status === 'paid' ? 'Lunas' : invoice.payment_status === 'pending' ? 'Menunggu' : 'Terlambat'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profil Saya</CardTitle>
              <CardDescription>Informasi pribadi dan kontak darurat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-500">Nama Lengkap</Label>
                  <p className="font-medium">{patient?.full_name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Nomor WhatsApp</Label>
                  <p className="font-medium">{patient?.phone_number}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{patient?.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">NIK</Label>
                  <p className="font-medium">{patient?.nik || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Tanggal Lahir</Label>
                  <p className="font-medium">{patient?.date_of_birth ? format(new Date(patient.date_of_birth), 'dd MMMM yyyy', { locale: id }) : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Jenis Kelamin</Label>
                  <p className="font-medium">{patient?.gender || '-'}</p>
                </div>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium mb-2">Kontak Darurat</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-500">Nama</Label>
                  <p className="font-medium">{patient?.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Nomor Telepon</Label>
                  <p className="font-medium">{patient?.emergency_contact_phone || '-'}</p>
                </div>
              </div>

              <hr className="my-4" />

              <h4 className="font-medium mb-2">Informasi Kesehatan</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-gray-500">Alergi</Label>
                  <p className="font-medium">{patient?.allergies || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Riwayat Penyakit</Label>
                  <p className="font-medium">{patient?.medical_conditions || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PortalDashboard;
