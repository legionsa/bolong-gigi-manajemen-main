
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        toast({
          title: "Pendaftaran Gagal",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user && !data.session) {
        // Email confirmation required — clinic will be created after verification
        setCreatedUserId(data.user.id);
        toast({
          title: "Kode OTP Dikirim",
          description: "Silakan cek email Anda untuk kode verifikasi",
        });
        setStep('verify');
      } else if (data.session) {
        // Email confirmation not required — create clinic and redirect to onboarding
        await createClinicForUser(data.session.user.id, fullName);
      }
    } catch (error) {
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createClinicForUser = async (userId: string, name: string) => {
    // Create a clinic with onboarding status
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .insert({
        name: `${name}'s Clinic`,
        status: 'onboarding',
        head_name: name,
      })
      .select('id')
      .single();

    if (clinicError || !clinic) {
      toast({
        title: "Pendaftaran Gagal",
        description: "Gagal membuat data Klinik. Silakan hubungi dukungan.",
        variant: "destructive",
      });
      return;
    }

    // Link user as clinic_admin
    const { error: linkError } = await supabase
      .from('clinic_users')
      .insert({
        clinic_id: clinic.id,
        user_id: userId,
        role: 'clinic_admin',
        status: 'active',
      });

    if (linkError) {
      toast({
        title: "Pendaftaran Gagal",
        description: "Gagal mengatur akses Klinik. Silakan hubungi dukungan.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pendaftaran Berhasil",
      description: "Akun berhasil dibuat! Mari siapkan Klinik Anda.",
    });
    navigate("/onboarding");
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        toast({
          title: "Verifikasi Gagal",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        // After verification, create the clinic
        await createClinicForUser(data.user.id, fullName);
      }
    } catch (error) {
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        toast({
          title: "Gagal Mengirim Ulang",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "OTP Dikirim Ulang",
          description: "Silakan cek email Anda",
        });
      }
    } catch (error) {
      toast({
        title: "Terjadi Kesalahan",
        description: "Silakan coba lagi nanti.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background Accent from Landing Page Style */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -right-32 w-[700px] h-[700px] rounded-full opacity-[0.06] bg-[radial-gradient(circle,hsl(185,100%,30%)_0%,transparent_70%)] animate-float-slow" />
        <div className="absolute top-40 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.05] bg-[radial-gradient(circle,hsl(30,80%,60%)_0%,transparent_70%)] animate-float" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Login
        </Link>

        <Card className="shadow-long border border-outline-variant/15 bg-surface-container-lowest rounded-3xl overflow-hidden p-2">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 medical-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white font-black text-2xl font-headline">DC</span>
            </div>
            <CardTitle className="text-2xl font-black text-primary font-headline">
              {step === 'register' ? 'Daftar Akun Baru' : 'Verifikasi Email'}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium mt-1">
              {step === 'register' 
                ? 'Buat akun untuk mengakses DentiCare Pro' 
                : 'Masukkan kode verifikasi yang dikirim ke email Anda'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-bold text-on-surface">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 rounded-xl bg-surface-container-low border-none focus-visible:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-on-surface">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-xl bg-surface-container-low border-none focus-visible:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-bold text-on-surface">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 rounded-xl bg-surface-container-low border-none focus-visible:ring-primary"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="medical"
                  className="w-full text-base font-bold shadow-md shadow-primary/20 h-12 mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? "Memproses..." : "Daftar Sekarang"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="font-bold text-on-surface text-center block">Kode Verifikasi</Label>
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={otp} 
                      onChange={setOtp}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="border-outline-variant/30 text-lg font-bold" />
                        <InputOTPSlot index={1} className="border-outline-variant/30 text-lg font-bold" />
                        <InputOTPSlot index={2} className="border-outline-variant/30 text-lg font-bold" />
                        <InputOTPSlot index={3} className="border-outline-variant/30 text-lg font-bold" />
                        <InputOTPSlot index={4} className="border-outline-variant/30 text-lg font-bold" />
                        <InputOTPSlot index={5} className="border-outline-variant/30 text-lg font-bold" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="medical"
                  className="w-full text-base font-bold shadow-md shadow-primary/20 h-12" 
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Memverifikasi..." : "Verifikasi"}
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full font-bold h-11 text-muted-foreground hover:text-primary" 
                  onClick={resendOTP}
                  disabled={isLoading}
                >
                  Kirim Ulang Kode
                </Button>
              </form>
            )}

            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Sudah punya akun?{" "}
                <Link to="/login" className="text-primary hover:text-primary-container font-black tracking-tight underline underline-offset-2 transition-colors">
                  Masuk sekarang
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
