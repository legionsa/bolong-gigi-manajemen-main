import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, FileText, DollarSign, Clock, User } from "lucide-react";
import DashboardStats from "@/components/DashboardStats";
import PatientManagement from "@/components/PatientManagement";
import AppointmentScheduler from "@/components/AppointmentScheduler";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistem Manajemen Klinik Gigi
          </h1>
          <p className="text-gray-600">
            Selamat datang di dashboard utama - {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pasien
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Jadwal
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardStats />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Jadwal Hari Ini
                  </CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('id-ID')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { time: "09:00", patient: "Budi Santoso", service: "Pemeriksaan Rutin", status: "scheduled" },
                    { time: "10:30", patient: "Siti Rahayu", service: "Pembersihan Karang Gigi", status: "in-progress" },
                    { time: "14:00", patient: "Ahmad Hidayat", service: "Penambalan Gigi", status: "scheduled" },
                    { time: "15:30", patient: "Maya Sari", service: "Konsultasi", status: "scheduled" }
                  ].map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-blue-600 w-12">
                          {appointment.time}
                        </div>
                        <div>
                          <p className="font-medium">{appointment.patient}</p>
                          <p className="text-sm text-gray-600">{appointment.service}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={appointment.status === 'in-progress' ? 'default' : 'outline'}
                        className={appointment.status === 'in-progress' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {appointment.status === 'in-progress' ? 'Berlangsung' : 'Terjadwal'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Pasien Terbaru
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Rizki Pratama", nik: "3173xxxxxxxxxxxx", phone: "0812-3456-7890", registered: "2024-06-14" },
                    { name: "Dewi Lestari", nik: "3271xxxxxxxxxxxx", phone: "0856-7890-1234", registered: "2024-06-13" },
                    { name: "Andi Wijaya", nik: "7371xxxxxxxxxxxx", phone: "0878-9012-3456", registered: "2024-06-12" }
                  ].map((patient, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-600">NIK: {patient.nik}</p>
                        <p className="text-xs text-gray-500">{patient.phone}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(patient.registered).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patients">
            <PatientManagement />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Sistem Billing</CardTitle>
                <CardDescription>
                  Manajemen tagihan dan pembayaran pasien
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Modul Billing Sedang Dikembangkan
                  </h3>
                  <p className="text-gray-500">
                    Fitur billing dan pembayaran akan tersedia segera
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
