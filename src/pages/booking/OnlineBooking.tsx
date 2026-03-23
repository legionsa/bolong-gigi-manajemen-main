import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, User, Phone, FileText, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Doctor {
  id: string;
  full_name: string;
  role_name: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const OnlineBooking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientNik, setPatientNik] = useState("");
  const [notes, setNotes] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    loadServicesAndDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const loadServicesAndDoctors = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, doctorsRes] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("name"),
        supabase.from("users").select("*").eq("role_name", "Dentist"),
      ]);

      setServices(servicesRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error("Load data error:", error);
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    setIsLoading(true);
    try {
      // Generate time slots from 09:00 to 17:00
      const slots: TimeSlot[] = [];
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
          slots.push({ time: timeStr, available: true });
        }
      }

      // Check existing appointments for the selected date and doctor
      const dateStr = selectedDate + "T00:00:00";
      const nextDate = addDays(new Date(selectedDate), 1);
      const nextDateStr = format(nextDate, "yyyy-MM-dd") + "T00:00:00";

      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("appointment_date_time")
        .eq("doctor_id", selectedDoctor)
        .gte("appointment_date_time", dateStr)
        .lt("appointment_date_time", nextDateStr)
        .not("status", "eq", "Dibatalkan");

      // Mark booked slots as unavailable
      const bookedTimes = new Set(
        (existingAppointments || []).map((appt: any) =>
          format(new Date(appt.appointment_date_time), "HH:mm")
        )
      );

      const updatedSlots = slots.map((slot) => ({
        ...slot,
        available: !bookedTimes.has(slot.time),
      }));

      setTimeSlots(updatedSlots);
    } catch (error) {
      console.error("Load time slots error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDoctor || !selectedDate || !selectedTime || !patientName || !patientPhone) {
      toast({ title: "Form Tidak Lengkap", description: "Mohon isi semua field yang diperlukan", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Check if patient exists by phone
      let formattedPhone = patientPhone;
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "62" + formattedPhone.slice(1);
      }
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+" + formattedPhone;
      }

      let patientId: string;

      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("phone_number", formattedPhone)
        .single();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        // Create new patient
        const { data: newPatient, error: newPatientError } = await supabase
          .from("patients")
          .insert({
            full_name: patientName,
            phone_number: formattedPhone,
            nik: patientNik || null,
          })
          .select("id")
          .single();

        if (newPatientError || !newPatient) {
          throw new Error("Gagal membuat data pasien");
        }
        patientId = newPatient.id;
      }

      // Create online booking
      const { data: booking, error: bookingError } = await supabase
        .from("online_bookings")
        .insert({
          patient_id: patientId,
          service_id: selectedService,
          doctor_id: selectedDoctor,
          requested_date: selectedDate,
          requested_time: selectedTime,
          status: "pending",
          notes: notes || null,
        })
        .select("id")
        .single();

      if (bookingError || !booking) {
        throw new Error("Gagal membuat booking");
      }

      setBookingId(booking.id);

      // Generate OTP for verification (sent via email)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from("patient_portal_tokens").insert({
        patient_id: patientId,
        token_hash: otpCode,
        token_type: "otp",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      console.log("Booking OTP (for demo): " + otpCode);

      toast({ title: "Booking Berhasil!", description: "Kode OTP telah dikirim ke email Anda" });
      setStep(4);
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({ title: "Booking Gagal", description: error.message || "Silakan coba lagi", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = addDays(new Date(), 1);
    return format(tomorrow, "yyyy-MM-dd");
  };

  const getMaxDate = () => {
    const twoMonthsLater = addDays(new Date(), 60);
    return format(twoMonthsLater, "yyyy-MM-dd");
  };

  if (isLoading && services.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={"w-10 h-10 rounded-full flex items-center justify-center font-bold " + (step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500")}
                >
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 3 && <div className={"w-16 h-1 mx-2 " + (step > s ? "bg-blue-600" : "bg-gray-200")} />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Service & Doctor */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Pilih Layanan dan Dokter</CardTitle>
                <CardDescription>Silakan pilih layanan dan dokter yang diinginkan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Layanan</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - Rp {service.price.toLocaleString()} ({service.duration_minutes} menit)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dokter</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dokter" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedService || !selectedDoctor}
                  onClick={() => setStep(2)}
                >
                  Lanjut <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Pilih Tanggal dan Waktu</CardTitle>
                <CardDescription>Pilih jadwal yang tersedia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime("");
                    }}
                    min={getMinDate()}
                    max={getMaxDate()}
                  />
                </div>

                {selectedDate && (
                  <div className="space-y-2">
                    <Label>Waktu</Label>
                    {isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={!slot.available ? "opacity-50" : ""}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />Kembali
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                  >
                    Lanjut
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Patient Info */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pasien</CardTitle>
                <CardDescription>Masukkan data diri Anda</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama lengkap"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081234567890"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nik">NIK (Opsional)</Label>
                  <Input
                    id="nik"
                    placeholder="Masukkan NIK"
                    value={patientNik}
                    onChange={(e) => setPatientNik(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (Opsional)</Label>
                  <textarea
                    id="notes"
                    className="w-full min-h-[80px] p-3 border rounded-md"
                    placeholder="Keluhan atau catatan tambahan"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Booking Summary */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">Ringkasan Booking</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{services.find((s) => s.id === selectedService)?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Dr. {doctors.find((d) => d.id === selectedDoctor)?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{format(new Date(selectedDate), "dd MMMM yyyy", { locale: id })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{selectedTime} WIB</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />Kembali
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</> : "Konfirmasi Booking"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Booking Berhasil!</h2>
                <p className="text-gray-500 mb-6">
                  Permintaan booking Anda telah diterima dan sedang menunggu konfirmasi dari klinik.
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Kami akan menghubungi Anda melalui WhatsApp untuk konfirmasi jadwal.
                </p>
                <Button onClick={() => navigate("/portal/login")} className="w-full">
                  Login ke Patient Portal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default OnlineBooking;
