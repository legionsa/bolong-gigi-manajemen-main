import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { User, Phone, Mail, Lock, AlertCircle, Save, Loader2, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface PatientProfile {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  address: string | null
  date_of_birth: string | null
  gender: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  allergies: string | null
  medical_conditions: string | null
  preferred_channel: string | null
}

const PortalProfile = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [formData, setFormData] = useState<Partial<PatientProfile>>({})
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const session = localStorage.getItem("patient_portal_session")
      if (!session) {
        navigate("/portal/login")
        return
      }

      const { patient_id } = JSON.parse(session)

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patient_id)
        .single()

      if (error || !data) {
        toast({ title: "Gagal Memuat Profil", description: "Silakan login ulang", variant: "destructive" })
        navigate("/portal/login")
        return
      }

      setProfile(data)
      setFormData({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        address: data.address,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        allergies: data.allergies,
        medical_conditions: data.medical_conditions,
        preferred_channel: data.preferred_channel,
      })
    } catch (error) {
      console.error("Error loading profile:", error)
      navigate("/portal/login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof PatientProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: formData.full_name,
          email: formData.email || null,
          phone_number: formData.phone_number || null,
          address: formData.address || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          allergies: formData.allergies || null,
          medical_conditions: formData.medical_conditions || null,
          preferred_channel: formData.preferred_channel || 'whatsapp',
        })
        .eq("id", profile.id)

      if (error) throw error

      toast({ title: "Profil Diperbarui", description: "Data profil berhasil disimpan" })
      loadProfile()
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({ title: "Gagal Menyimpan", description: "Silakan coba lagi", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Password Tidak Sama", description: "Pastikan password baru dan konfirmasi sama", variant: "destructive" })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({ title: "Password Terlalu Pendek", description: "Password minimal 6 karakter", variant: "destructive" })
      return
    }

    if (!profile) return

    setIsSaving(true)
    try {
      const currentHash = btoa(passwordData.currentPassword)
      if (currentHash !== profile.portal_password_hash) {
        toast({ title: "Password Salah", description: "Password saat ini tidak benar", variant: "destructive" })
        setIsSaving(false)
        return
      }

      const newHash = btoa(passwordData.newPassword)
      const { error } = await supabase
        .from("patients")
        .update({ portal_password_hash: newHash })
        .eq("id", profile.id)

      if (error) throw error

      toast({ title: "Password Diubah", description: "Password berhasil diperbarui" })
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      console.error("Error changing password:", error)
      toast({ title: "Gagal Mengubah Password", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("patient_portal_session")
    navigate("/portal/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
            <p className="text-sm text-gray-500">Kelola data pribadi Anda</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="medical">Medis</TabsTrigger>
            <TabsTrigger value="security">Keamanan</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Data Pribadi
                  </CardTitle>
                  <CardDescription>Informasi dasar akun Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nama Lengkap</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name || ""}
                      onChange={(e) => handleInputChange("full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="email@contoh.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Nomor WhatsApp</Label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <Input
                        id="phone_number"
                        value={formData.phone_number || ""}
                        onChange={(e) => handleInputChange("phone_number", e.target.value)}
                        placeholder="+62"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Textarea
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Jl. Rumah Anda No. 1, Kota"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth || ""}
                        onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Jenis Kelamin</Label>
                      <select
                        id="gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.gender || ""}
                        onChange={(e) => handleInputChange("gender", e.target.value)}
                      >
                        <option value="">Pilih</option>
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Kontak Darurat
                  </CardTitle>
                  <CardDescription>Hubungi saat darurat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Nama Kontak</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name || ""}
                      onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                      placeholder="Nama keluarga/kerabat"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Nomor Telepon</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone || ""}
                      onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                      placeholder="+62"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Informasi Medis
                </CardTitle>
                <CardDescription>Riwayat kesehatan untuk membantu dokter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Alergi</Label>
                    <Textarea
                      id="allergies"
                      value={formData.allergies || ""}
                      onChange={(e) => handleInputChange("allergies", e.target.value)}
                      placeholder="Contoh: Alergi penisilin, alergi udang"
                    />
                    <p className="text-xs text-gray-500">Pisahkan dengan koma jika lebih dari satu</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medical_conditions">Riwayat Penyakit</Label>
                    <Textarea
                      id="medical_conditions"
                      value={formData.medical_conditions || ""}
                      onChange={(e) => handleInputChange("medical_conditions", e.target.value)}
                      placeholder="Contoh: Diabetes, tekanan darah tinggi"
                    />
                    <p className="text-xs text-gray-500">Pisahkan dengan koma jika lebih dari satu</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Informasi Medis
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Ubah Password
                </CardTitle>
                <CardDescription>Perbarui password portal Anda</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mengubah...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Ubah Password
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default PortalProfile
