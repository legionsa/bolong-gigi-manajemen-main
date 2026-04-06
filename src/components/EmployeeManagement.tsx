import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { UserCog, Plus, Search, MoreVertical, Mail, Ban, CheckCircle, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_OPTIONS = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'finance', label: 'Finance' },
  { value: 'perawat', label: 'Perawat' },
];

const ROLE_COLORS: Record<string, string> = {
  front_desk: 'bg-blue-100 text-blue-800',
  finance: 'bg-green-100 text-green-800',
  perawat: 'bg-purple-100 text-purple-800',
};

const ROLE_PERMISSIONS: Record<string, { label: string; description: string }[]> = {
  front_desk: [
    { label: 'Melihat jadwal', description: 'Melihat jadwal appointment' },
    { label: 'Check-in pasien', description: 'Check-in dan check-out pasien' },
    { label: 'Billing dasar', description: 'Melihat dan membuat faktur' },
  ],
  finance: [
    { label: 'Lihat billing', description: 'Melihat semua faktur' },
    { label: 'Mark as paid', description: 'Tandai faktur sebagai lunas' },
    { label: 'Export laporan', description: 'Export laporan keuangan' },
  ],
  perawat: [
    { label: 'Melihat jadwal', description: 'Melihat jadwal appointment' },
    { label: 'Check-in pasien', description: 'Check-in dan check-out pasien' },
    { label: 'Billing dasar', description: 'Melihat dan membuat faktur' },
    { label: 'Assist dokter', description: 'Membantu dokter saat tindakan' },
  ],
};

interface Employee {
  id: string;
  user_id: string;
  clinic_id: string;
  role: string;
  status: string;
  date_started: string;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
  user_phone?: string;
  last_login?: string;
}

const EmployeeTableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>Nama</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Aksi</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[1, 2, 3].map(i => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[100px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const EmployeeManagement = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('front_desk');
  const [inviteName, setInviteName] = useState('');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteDegree, setInviteDegree] = useState('');
  const [inviting, setInviting] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);

  useEffect(() => {
    loadClinicAndEmployees();
  }, []);

  const loadClinicAndEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get clinic_id for this admin
    const { data: cu } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .eq('role', 'clinic_admin')
      .single();

    if (!cu) { setIsLoading(false); return; }
    setClinicId(cu.clinic_id);

    // Get all clinic users (excluding dentists and admin owner)
    const nonDoctorRoles = ['front_desk', 'finance', 'perawat'];
    const { data: clinicUsers } = await supabase
      .from('clinic_users')
      .select('*')
      .eq('clinic_id', cu.clinic_id)
      .in('role', nonDoctorRoles);

    if (!clinicUsers) { setIsLoading(false); return; }

    // Get user profiles
    const userIds = clinicUsers.map(cu => cu.user_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    // Get auth emails (from metadata if available)
    const enriched = clinicUsers.map(cu => ({
      ...cu,
      user_email: cu.user_id ? `user-${cu.user_id.slice(0, 8)}@...` : '',
      user_full_name: profileMap[cu.user_id]?.full_name || '',
    }));

    setEmployees(enriched);
    setIsLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName || !clinicId) return;
    setInviting(true);

    try {
      // Build full name with title and degree for nurses
      let fullName = inviteName;
      if (inviteRole === 'perawat' && inviteTitle) {
        fullName = `${inviteTitle} ${inviteName}${inviteDegree ? ', ' + inviteDegree : ''}`;
      }

      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: { full_name: fullName, role: inviteRole }
      });

      if (error) throw error;

      toast({
        title: "Undangan Terkirim",
        description: `Email undangan dikirim ke ${inviteEmail}. Staf akan muncul setelah mereka membuat akun.`,
      });

      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteTitle('');
      setInviteDegree('');
      setInviteRole('front_desk');
    } catch (error: any) {
      toast({
        title: "Gagal Mengirim Undangan",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('clinic_users')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', employee.id);

      if (error) throw error;

      setEmployees(prev => prev.map(e =>
        e.id === employee.id ? { ...e, status: 'inactive' } : e
      ));

      toast({ title: "Staf Dideaktifkan", description: `${employee.user_full_name || 'Staf'} tidak bisa lagi login.` });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleReactivate = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('clinic_users')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', employee.id);

      if (error) throw error;

      setEmployees(prev => prev.map(e =>
        e.id === employee.id ? { ...e, status: 'active' } : e
      ));

      toast({ title: "Staf Diaktifkan Kembali", description: `${employee.user_full_name || 'Staf'} bisa login kembali.` });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="bg-surface-container-lowest shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-on-secondary-fixed" />
                </div>
                Manajemen Staf Non-Medis
              </CardTitle>
              <CardDescription className="mt-2">
                Kelola resepsionis, perawat, asisten, apoteker, dan admin.
              </CardDescription>
            </div>
            <Dialog open={isInviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="medical" className="gap-2 w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4" />
                  Undang Staf
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-white">
                <DialogHeader>
                  <DialogTitle className="text-on-surface">Undang Staf Baru</DialogTitle>
                  <DialogDescription className="text-on-surface-variant">
                    Email undangan akan dikirim. Staf akan muncul setelah mereka membuat akun.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-role" className="font-semibold text-on-surface">Role</Label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={e => {
                        const newRole = e.target.value;
                        setInviteRole(newRole);
                        if (newRole === 'perawat') {
                          setInviteTitle('Ns.');
                        } else {
                          setInviteTitle('');
                        }
                        setInviteDegree('');
                        setInviteName('');
                      }}
                      className="w-full h-12 px-4 rounded-xl bg-white border border-outline text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none"
                    >
                      {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  {inviteRole === 'perawat' && (
                    <div className="space-y-2">
                      <Label htmlFor="invite-title" className="font-semibold text-on-surface">Title</Label>
                      <select
                        id="invite-title"
                        value={inviteTitle}
                        disabled
                        className="w-full h-12 px-4 rounded-xl bg-gray-100 border border-outline text-on-surface appearance-none cursor-not-allowed"
                      >
                        <option value="Ns.">Ns. (Ners)</option>
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="invite-name" className="font-semibold text-on-surface">Nama Lengkap</Label>
                    <Input
                      id="invite-name"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="Nama lengkap staf"
                      className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  {inviteRole === 'perawat' && (
                    <div className="space-y-2">
                      <Label htmlFor="invite-degree" className="font-semibold text-on-surface">Gelar</Label>
                      <select
                        id="invite-degree"
                        value={inviteDegree}
                        onChange={e => setInviteDegree(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-white border border-outline text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none"
                      >
                        <option value="">Pilih Gelar</option>
                        <option value="S.Kep">S.Kep</option>
                        <option value="A.Md.Kep">A.Md.Kep</option>
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="invite-email" className="font-semibold text-on-surface">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="staf@klinikkamu.com"
                      className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-3 mt-2">
                    <p className="text-xs font-semibold text-on-surface-variant mb-2">Hak akses:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLE_OPTIONS.map(role => (
                        <div key={role.value} className={`rounded-lg p-2 ${inviteRole === role.value ? 'bg-primary/10 border border-primary/30' : 'bg-surface-container-lowest'}`}>
                          <p className="text-xs font-bold text-on-surface mb-1">{role.label}</p>
                          <ul className="text-[10px] text-on-surface-variant space-y-0.5">
                            {ROLE_PERMISSIONS[role.value]?.map(p => (
                              <li key={p.label} className="flex items-start gap-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-primary flex-shrink-0 mt-0.5" />
                                <span>{p.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" variant="medical" disabled={inviting} className="gap-2">
                      {inviting ? 'Mengirim...' : 'Kirim Undangan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
              <Input
                placeholder="Cari nama, email, atau role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface-container-low border-0 focus:bg-surface-container focus:ring-2 focus:ring-primary/30 rounded-xl"
              />
            </div>
          </div>

          {isLoading ? <EmployeeTableSkeleton /> : (
            filteredEmployees.length === 0 ? (
              <div className="text-center py-16">
                <UserCog className="w-12 h-12 mx-auto text-on-surface-variant/30 mb-3" />
                <p className="font-semibold text-on-surface mb-1">Belum ada staf</p>
                <p className="text-sm text-on-surface-variant mb-4">
                  Undang resepsionis, perawat, atau staf lainnya.
                </p>
                <Button variant="medical" onClick={() => setInviteOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Undang Staf
                </Button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-outline-variant/20">
                      <TableHead className="text-on-surface-variant font-semibold">Nama</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Role</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Email</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Status</TableHead>
                      <TableHead className="text-right text-on-surface-variant font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(emp => (
                      <TableRow key={emp.id} className="hover:bg-surface-container-low border-b border-outline-variant/10">
                        <TableCell className="font-medium text-on-surface">
                          {emp.user_full_name || emp.user_id?.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[emp.role] || 'bg-gray-100 text-gray-800'}>
                            {ROLE_OPTIONS.find(r => r.value === emp.role)?.label || emp.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-on-surface-variant text-sm font-mono">
                          {emp.user_email}
                        </TableCell>
                        <TableCell>
                          {emp.status === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </Badge>
                          ) : emp.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <CheckCircle className="w-3 h-3" /> Aktif
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 gap-1">
                              <Ban className="w-3 h-3" /> Nonaktif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs text-on-surface-variant">Aksi</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {emp.status !== 'active' ? (
                                <DropdownMenuItem onClick={() => handleReactivate(emp)} className="gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  Aktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleDeactivate(emp)} className="gap-2">
                                  <Ban className="w-4 h-4 text-red-600" />
                                  Nonaktifkan
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
