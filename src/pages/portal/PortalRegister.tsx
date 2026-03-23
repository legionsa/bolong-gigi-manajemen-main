import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Phone, Mail, Lock } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

const PortalRegister = () => {
  const [step, setStep] = useState<'verify' | 'details' | 'password'>('verify')
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.startsWith("0")) {
      return "62" + digits.slice(1)
    }
    return digits
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const formattedPhone = formatPhone(phone)

    if (formattedPhone.length < 10) {
      toast({ title: "Nomor Tidak Valid", description: "Masukkan nomor WhatsApp yang valid", variant: "destructive" })
      setIsLoading(false)
      return
    }

    try {
      // Check if patient exists
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, full_name, phone_number")
        .eq("phone_number", `+${formattedPhone}`)
        .single()

      if (patientError || !patient) {
        toast({ title: "Pasien Tidak Ditemukan", description: "Nomor ini belum terdaftar di sistem kami", variant: "destructive" })
        setIsLoading(false)
        return
      }

      // Check if portal already active
      const { data: portalPatient } = await supabase
        .from("patients")
        .select("is_portal_active")
        .eq("id", patient.id)
        .single()

      if (portalPatient?.is_portal_active) {
        toast({ title: "Akun Sudah Terdaftar", description: "Portal pasien sudah aktif untuk nomor ini. Silakan login.", variant: "destructive" })
        setIsLoading(false)
        return
      }

      setPatientId(patient.id)

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      await supabase.from("patient_portal_tokens").insert({
        patient_id: patient.id,
        token_hash: otpCode,
        token_type: "otp",
        expires_at: expiresAt,
      })

      console.log(`OTP: ${otpCode}`)
      toast({ title: "OTP Terkirim", description: "Kode OTP telah dikirim ke nomor Anda" })
      setStep('details')
    } catch (error) {
      console.error("Error:", error)
      toast({ title: "Terjadi Kesalahan", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: tokenData, error: tokenError } = await supabase
        .from("patient_portal_tokens")
        .select("*")
        .eq("token_hash", otp)
        .eq("token_type", "otp")
        .gt("expires_at", new Date().toISOString())
        .single()

      if (tokenError || !tokenData) {
        toast({ title: "OTP Tidak Valid", description: "Kode OTP salah atau sudah kadaluarsa", variant: "destructive" })
        setIsLoading(false)
        return
      }

      // Mark token as used
      await supabase.from("patient_portal_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenData.id)

      toast({ title: "Verifikasi Berhasil", description: "Silakan buat password untuk mengaktifkan portal" })
      setStep('password')
    } catch (error) {
      toast({ title: "Terjadi Kesalahan", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (password !== confirmPassword) {
      toast({ title: "Password Tidak Sama", description: "Pastikan password dan konfirmasi password sama", variant: "destructive" })
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      toast({ title: "Password Terlalu Pendek", description: "Password minimal 6 karakter", variant: "destructive" })
      setIsLoading(false)
      return
    }

    try {
      if (!patientId) {
        toast({ title: "Sesi Tidak Valid", description: "Silakan ulangi proses pendaftaran", variant: "destructive" })
        setIsLoading(false)
        return
      }

      const passwordHash = btoa(password)

      // Update patient with portal credentials
      const { error: updateError } = await supabase
        .from("patients")
        .update({
          portal_password_hash: passwordHash,
          is_portal_active: true,
          portal_activated_at: new Date().toISOString(),
          email: email || null,
        })
        .eq("id", patientId)

      if (updateError) {
        console.error("Update error:", updateError)
        toast({ title: "Gagal Mendaftarkan", description: "Silakan coba lagi", variant: "destructive" })
        setIsLoading(false)
        return
      }

      // Send welcome email
      if (email) {
        try {
          const { sendWelcomeEmail } = await import("@/lib/email")
          await sendWelcomeEmail({
            to: email,
            patientName: formData.full_name || "Patient",
            portalUrl: import.meta.env.VITE_PORTAL_URL || "http://localhost:5173/portal",
          })
        } catch (emailError) {
          console.log("Welcome email error (non-blocking):", emailError)
        }
      }

      toast({ title: "Pendaftaran Berhasil", description: "Anda sekarang bisa login ke Patient Portal" })
      navigate("/portal/login")
    } catch (error) {
      console.error("Register error:", error)
      toast({ title: "Terjadi Kesalahan", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🦷</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Patient Portal</h1>
          <p className="text-gray-600 mt-2">DentiCare Pro</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {step === 'verify' && "Verifikasi Nomor"}
              {step === 'details' && "Verifikasi OTP"}
              {step === 'password' && "Buat Password"}
            </CardTitle>
            <CardDescription>
              {step === 'verify' && "Masukkan nomor WhatsApp yang terdaftar"}
              {step === 'details' && "Masukkan kode OTP yang telah dikirim"}
              {step === 'password' && "Buat password untuk login portal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'verify' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <Input id="phone" type="tel" placeholder="081234567890" value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</> : "Verifikasi"}
                </Button>
                <div className="text-center text-sm">
                  <Link to="/portal/login" className="text-gray-600 hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" />Sudah punya akun? Login
                  </Link>
                </div>
              </form>
            )}

            {step === 'details' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Kode OTP</Label>
                  <Input id="otp" type="text" placeholder="Masukkan 6 digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="text-center text-lg tracking-widest" />
                  <p className="text-xs text-gray-500 text-center">OTP dikirim ke console (dev mode)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Opsional)</Label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <Input id="email" type="email" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
                  </div>
                  <p className="text-xs text-gray-500">Email digunakan untuk mengirim kode OTP dan notifikasi</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memverifikasi...</> : "Verifikasi OTP"}
                </Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => setStep('verify')} className="text-gray-600 hover:underline flex items-center justify-center gap-1 mx-auto">
                    <ArrowLeft className="w-4 h-4" />Ganti nomor
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <Input id="password" type="password" placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <div className="flex items-center space-x-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <Input id="confirmPassword" type="password" placeholder="Ulangi password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mendaftarkan...</> : "Daftar"}
                </Button>
                <div className="text-center text-sm">
                  <button type="button" onClick={() => setStep('verify')} className="text-gray-600 hover:underline flex items-center justify-center gap-1 mx-auto">
                    <ArrowLeft className="w-4 h-4" />Ganti nomor
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PortalRegister
