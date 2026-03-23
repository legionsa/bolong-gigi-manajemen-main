import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, Lock, ArrowLeft, Loader2, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendOtp } from "@/lib/communications";

const PortalLogin = () => {
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      return "62" + digits.slice(1);
    }
    return digits;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formattedPhone = formatPhone(phone);

    if (formattedPhone.length < 10) {
      toast({ title: "Nomor Tidak Valid", description: "Masukkan nomor WhatsApp yang valid", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, full_name, email, is_portal_active")
        .eq("phone_number", `+${formattedPhone}`)
        .single();

      if (patientError || !patient) {
        toast({ title: "Pasien Tidak Ditemukan", description: "Nomor ini belum terdaftar", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!patient.is_portal_active) {
        setIsRegistering(true);
        toast({ title: "Portal Belum Diaktifkan", description: "Silakan buat password untuk mengaktifkan portal." });
        setStep('password');
        setIsLoading(false);
        return;
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("patient_portal_tokens").insert({
        patient_id: patient.id,
        token_hash: otpCode,
        token_type: "otp",
        expires_at: expiresAt,
      });

      // Send OTP via email (primary channel)
      const emailResult = await sendOtp({
        to: formattedPhone,
        email: patient.email,
        phone: formattedPhone,
        otp: otpCode,
        patientName: patient.full_name,
      });

      if (emailResult.success) {
        toast({ title: "OTP Terkirim", description: `Kode OTP telah dikirim ke email ${patient.email || 'terdaftar'}` });
      } else {
        // Even if email fails, show OTP for development
        console.log(`OTP: ${otpCode}`);
        toast({ title: "OTP Terkirim", description: "Kode OTP telah dikirim (cek console jika email gagal)" });
      }

      setStep('otp');
    } catch (error) {
      console.error("OTP send error:", error);
      toast({ title: "Terjadi Kesalahan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formattedPhone = formatPhone(phone);

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from("patient_portal_tokens")
        .select("*")
        .eq("token_hash", otp)
        .eq("token_type", "otp")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        toast({ title: "OTP Tidak Valid", description: "Kode OTP salah atau sudah kadaluarsa", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      await supabase.from("patient_portal_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenData.id);

      localStorage.setItem("patient_portal_session", JSON.stringify({
        patient_id: tokenData.patient_id,
        phone: formattedPhone,
        login_at: new Date().toISOString(),
      }));

      toast({ title: "Login Berhasil", description: "Selamat datang di Patient Portal" });
      navigate("/portal/dashboard");
    } catch (error) {
      toast({ title: "Terjadi Kesalahan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formattedPhone = formatPhone(phone);

    try {
      const { data: patient, error } = await supabase
        .from("patients")
        .select("id, portal_password_hash")
        .eq("phone_number", `+${formattedPhone}`)
        .single();

      if (error || !patient) {
        toast({ title: "Login Gagal", description: "Nomor atau password salah", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const inputHash = btoa(password);
      if (inputHash !== patient.portal_password_hash) {
        toast({ title: "Login Gagal", description: "Nomor atau password salah", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      localStorage.setItem("patient_portal_session", JSON.stringify({
        patient_id: patient.id,
        phone: formattedPhone,
        login_at: new Date().toISOString(),
      }));

      toast({ title: "Login Berhasil" });
      navigate("/portal/dashboard");
    } catch (err) {
      toast({ title: "Terjadi Kesalahan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({ title: "Password Tidak Sama", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const formattedPhone = formatPhone(phone);

    try {
      const { data: patient } = await supabase.from("patients").select("id").eq("phone_number", `+${formattedPhone}`).single();
      if (!patient) {
        toast({ title: "Pasien Tidak Ditemukan", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const passwordHash = btoa(password);
      await supabase.from("patients").update({
        portal_password_hash: passwordHash,
        is_portal_active: true,
        portal_activated_at: new Date().toISOString(),
      }).eq("id", patient.id);

      toast({ title: "Portal Diaktifkan", description: "Silakan login dengan password" });
      setIsRegistering(false);
      setStep('password');
    } catch (err) {
      toast({ title: "Terjadi Kesalahan", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🦷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-gray-600 mt-2">DentiCare Pro</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {step === 'phone' && (isRegistering ? "Daftar Portal Pasien" : "Login Portal Pasien")}
              {step === 'otp' && "Verifikasi OTP"}
              {step === 'password' && (isRegistering ? "Buat Password" : "Login dengan Password")}
            </CardTitle>
            <CardDescription>
              {step === 'phone' && "Masukkan nomor WhatsApp Anda yang terdaftar"}
              {step === 'otp' && "Masukkan kode OTP yang telah dikirim"}
              {step === 'password' && "Masukkan password untuk portal pasien"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <Input id="phone" type="tel" placeholder="081234567890" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</> : "Kirim OTP"}
                </Button>
                <div className="text-center text-sm">
                  <Link to="/portal/register" className="text-blue-600 hover:underline">Daftar di sini</Link>
                </div>
                <div className="text-center text-sm">
                  <Link to="/login" className="text-gray-600 hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" />Kembali ke login staff
                  </Link>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Kode OTP</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                        <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memverifikasi...</> : "Verifikasi"}
                </Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => { setOtp(""); handleSendOtp({ preventDefault: () => {} } as React.FormEvent); }} className="text-blue-600 hover:underline">Kirim Ulang OTP</button>
                </div>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => { setStep('phone'); setOtp(''); }} className="text-gray-600 hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" />Ganti nomor
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={isRegistering ? handleRegister : handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <Input id="password" type="password" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1" />
                  </div>
                </div>
                {isRegistering && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                    <div className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <Input id="confirmPassword" type="password" placeholder="Konfirmasi password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isRegistering ? "Mendaftarkan..." : "Login..."}</> : (isRegistering ? "Daftar" : "Login")}
                </Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => { setStep('phone'); setPassword(''); setConfirmPassword(''); setIsRegistering(false); }} className="text-gray-600 hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" />Ganti nomor
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortalLogin;
