import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Building2, Plus, Search, MoreVertical, MapPin, Phone, Mail, Star,
  Trash2, Edit, CheckCircle, XCircle, Wifi
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBranches, Branch } from "@/hooks/useBranches";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  is_main: boolean;
}

const BranchTableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>Nama</TableHead>
        <TableHead>Alamat</TableHead>
        <TableHead>Kontak</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Aksi</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[1, 2, 3].map(i => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const initialFormData: BranchFormData = {
  name: "",
  address: "",
  phone: "",
  email: "",
  whatsapp: "",
  is_main: false,
};

export default function BranchManagement() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);

  // Dialog states
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  useEffect(() => {
    loadClinicAndBranches();
  }, []);

  const loadClinicAndBranches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get clinic_id for this admin
    const { data: cu } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .eq('role', 'clinic_admin')
      .single();

    if (!cu) {
      setIsLoading(false);
      return;
    }

    setClinicId(cu.clinic_id);

    // Get all branches for this clinic
    const { data: branchesData } = await supabase
      .from('branches')
      .select('*')
      .eq('clinic_id', cu.clinic_id)
      .order('is_main', { ascending: false })
      .order('name', { ascending: true });

    setBranches(branchesData || []);
    setIsLoading(false);
  };

  const { createBranch, updateBranch, deleteBranch, setMainBranch } = useBranches(clinicId || undefined);

  const handleOpenForm = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        whatsapp: branch.whatsapp || "",
        is_main: branch.is_main,
      });
    } else {
      setEditingBranch(null);
      setFormData(initialFormData);
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingBranch(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Gagal", description: "Nama cabang harus diisi.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingBranch) {
        await updateBranch({
          id: editingBranch.id,
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          whatsapp: formData.whatsapp || null,
          is_main: formData.is_main,
        });
        toast({ title: "Sukses", description: "Cabang berhasil diperbarui." });
      } else {
        await createBranch({
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          whatsapp: formData.whatsapp || null,
          is_main: formData.is_main,
        });
        toast({ title: "Sukses", description: "Cabang baru berhasil ditambahkan." });
      }

      handleCloseForm();
      loadClinicAndBranches();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMain = async (branch: Branch) => {
    try {
      await setMainBranch(branch.id);
      toast({ title: "Sukses", description: `${branch.name} ditetapkan sebagai cabang utama.` });
      loadClinicAndBranches();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    try {
      await deleteBranch(branchToDelete.id);
      toast({ title: "Sukses", description: `${branchToDelete.name} telah dihapus.` });
      setDeleteConfirmOpen(false);
      setBranchToDelete(null);
      loadClinicAndBranches();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message || "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="bg-surface-container-lowest shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-on-secondary-fixed" />
                </div>
                Manajemen Cabin / Branch
              </CardTitle>
              <CardDescription className="mt-2">
                Kelola lokasi cabang atau cabin klinik.
              </CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="medical"
                  className="gap-2 w-full sm:w-auto justify-center"
                  onClick={() => handleOpenForm()}
                >
                  <Plus className="w-4 h-4" />
                  Tambah Cabin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-surface-container-lowest">
                <DialogHeader>
                  <DialogTitle className="text-on-surface">
                    {editingBranch ? "Edit Cabin" : "Tambah Cabin Baru"}
                  </DialogTitle>
                  <DialogDescription className="text-on-surface-variant">
                    {editingBranch
                      ? "Perbarui detail cabin yang sudah ada."
                      : "Isi form di bawah ini untuk menambahkan cabin baru."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold text-on-surface">Nama Cabin *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Contoh: Cabin Utama"
                      className="bg-surface-container-low border-none rounded-xl h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-semibold text-on-surface">Alamat</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Jl. Raya Klinik No. 1"
                      className="bg-surface-container-low border-none rounded-xl h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-semibold text-on-surface">Telepon</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="021-123456"
                        className="bg-surface-container-low border-none rounded-xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp" className="font-semibold text-on-surface">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="0812-3456-7890"
                        className="bg-surface-container-low border-none rounded-xl h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-on-surface">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="cabang@klinikkami.com"
                      className="bg-surface-container-low border-none rounded-xl h-12"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_main"
                      checked={formData.is_main}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_main: checked === true }))}
                    />
                    <Label htmlFor="is_main" className="text-on-surface font-normal">
                      Jadikan cabin utama
                    </Label>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseForm}>
                      Batal
                    </Button>
                    <Button type="submit" variant="medical" disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? "Menyimpan..." : (editingBranch ? "Simpan Perubahan" : "Tambah Cabin")}
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
                placeholder="Cari nama, alamat, atau telepon..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface-container-low border-0 focus:bg-surface-container focus:ring-2 focus:ring-primary/30 rounded-xl"
              />
            </div>
          </div>

          {isLoading ? <BranchTableSkeleton /> : (
            filteredBranches.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-12 h-12 mx-auto text-on-surface-variant/30 mb-3" />
                <p className="font-semibold text-on-surface mb-1">Belum ada cabin</p>
                <p className="text-sm text-on-surface-variant mb-4">
                  Tambahkan cabin atau lokasi baru untuk klinik Anda.
                </p>
                <Button variant="medical" onClick={() => handleOpenForm()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Tambah Cabin
                </Button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-outline-variant/20">
                      <TableHead className="text-on-surface-variant font-semibold">Nama</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Alamat</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Kontak</TableHead>
                      <TableHead className="text-on-surface-variant font-semibold">Status</TableHead>
                      <TableHead className="text-right text-on-surface-variant font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBranches.map(branch => (
                      <TableRow key={branch.id} className="hover:bg-surface-container-low border-b border-outline-variant/10">
                        <TableCell className="font-medium text-on-surface">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{branch.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-on-surface-variant text-sm">
                          <div className="flex items-center gap-1.5 max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-on-surface-variant/60" />
                            <span className="truncate">{branch.address || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-on-surface-variant text-sm">
                          <div className="space-y-1">
                            {branch.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-on-surface-variant/60 flex-shrink-0" />
                                <span className="text-xs">{branch.phone}</span>
                              </div>
                            )}
                            {branch.whatsapp && (
                              <div className="flex items-center gap-1.5">
                                <Wifi className="w-3.5 h-3.5 text-on-surface-variant/60 flex-shrink-0" />
                                <span className="text-xs">{branch.whatsapp}</span>
                              </div>
                            )}
                            {!branch.phone && !branch.whatsapp && <span className="text-xs">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {branch.is_main ? (
                            <Badge className="bg-primary-fixed/20 text-primary border-primary-fixed/30 gap-1">
                              <Star className="w-3 h-3" />
                              Utama
                            </Badge>
                          ) : (
                            <Badge className="bg-surface-container text-on-surface-variant">
                              Cabin
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

                              {!branch.is_main && (
                                <DropdownMenuItem onClick={() => handleSetMain(branch)} className="gap-2">
                                  <CheckCircle className="w-4 h-4 text-primary" />
                                  Jadikan Utama
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => handleOpenForm(branch)} className="gap-2">
                                <Edit className="w-4 h-4 text-blue-600" />
                                Edit
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(branch)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                                Hapus
                              </DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="text-on-surface flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Apakah Anda yakin ingin menghapus cabin "{branchToDelete?.name}"?
              Cabin yang dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Hapus Cabin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
