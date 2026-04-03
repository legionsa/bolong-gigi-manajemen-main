import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "Email Belum Diverifikasi",
            description: "Silakan verifikasi email Anda terlebih dahulu",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Gagal",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Berhasil",
          description: "Selamat datang kembali!",
        });
        navigate("/dashboard");
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

  const handleMagicLink = async () => {
    if (!email) {
      toast({
        title: "Email Diperlukan",
        description: "Masukkan email terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) {
        toast({
          title: "Gagal Mengirim Magic Link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Magic Link Dikirim",
          description: "Cek email Anda untuk link login",
        });
        setStep('verify');
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

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (error) {
        toast({
          title: "Verifikasi Gagal",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Berhasil",
          description: "Selamat datang!",
        });
        navigate("/dashboard");
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
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-semibold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <Card className="shadow-long border border-outline-variant/15 bg-surface-container-lowest rounded-3xl overflow-hidden p-2">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 medical-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white font-black text-2xl font-headline">DC</span>
            </div>
            <CardTitle className="text-2xl font-black text-primary font-headline">
              {step === 'login' ? 'Masuk ke DentiCare Pro' : 'Verifikasi Magic Link'}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium mt-1">
              {step === 'login' 
                ? 'Akses sistem manajemen klinik gigi Anda'
                : 'Masukkan kode yang dikirim ke email Anda'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 'login' ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
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
                        placeholder="Masukkan password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 rounded-xl bg-surface-container-low border-none focus-visible:ring-primary"
                        required
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
                    className="w-full text-base font-bold shadow-md shadow-primary/20 h-12" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Memproses..." : "Masuk"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-outline-variant/20" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="bg-surface-container-lowest px-2 text-muted-foreground">Atau</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full font-bold h-11" 
                  onClick={handleMagicLink}
                  disabled={isLoading || !email}
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  {isLoading ? "Mengirim..." : "Kirim Magic Link"}
                </Button>
              </>
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
                  onClick={() => setStep('login')}
                >
                  Kembali ke Login
                </Button>
              </form>
            )}

            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link to="/register" className="text-primary hover:text-primary-container font-black tracking-tight underline underline-offset-2 transition-colors">
                  Daftar sekarang
                </Link>
              </p>
              {step === 'login' && (
                <p className="text-xs text-muted-foreground font-medium">
                  <Link to="/forgot-password" className="hover:text-primary transition-colors">
                    Lupa password?
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-xs font-bold tracking-wider uppercase text-muted-foreground/60">
          Dilindungi dengan enkripsi tingkat enterprise
        </div>
      </div>
    </div>
  );
};

export default Login;
