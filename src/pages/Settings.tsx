
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicSettingsSchema, type ClinicSettingsData } from '@/lib/schemas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

const Settings = () => {
  const { settings, isLoading, updateSettings, isUpdating } = useClinicSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { can, role } = usePermissions();

  // Only clinic_admin and superadmin can edit
  const canEdit = can('clinic.settings');

  const form = useForm<ClinicSettingsData>({
    resolver: zodResolver(clinicSettingsSchema),
  });

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      form.reset(settings);
    }
  }, [settings, form]);

  const onSubmit = async (data: ClinicSettingsData) => {
    if (!canEdit) return;

    // Check if settings record exists
    if (!settings?.id) {
      toast({
        title: 'Gagal',
        description: 'Rekaman pengaturan klinik tidak ditemukan. Hubungi superadmin.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSettings({ id: settings.id, ...data });
      toast({
        title: 'Sukses',
        description: 'Pengaturan klinik berhasil diperbarui.',
      });
    } catch (error) {
      toast({
        title: 'Gagal',
        description: 'Gagal memperbarui pengaturan: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 px-4 md:px-8 py-8">
            <div className="space-y-6 animate-pulse">
              <Skeleton className="h-10 w-72" />
              <Card className="bg-surface-container-lowest">
                <CardContent className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-20 flex items-center px-4 md:px-8 bg-surface/80 backdrop-blur-md shadow-long border-b border-outline-variant/[0.07]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mr-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <h1 className="text-lg font-semibold text-on-surface">Pengaturan Klinik</h1>
        </header>
        <main
          id="settings-main"
          className="flex-1 px-4 md:px-8 py-8 pb-24 lg:pb-8"
          role="main"
          aria-label="Pengaturan klinik"
        >
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
                Pengaturan Klinik
              </h1>
              <p className="text-on-surface-variant text-sm mt-0.5">
                Kelola informasi detail mengenai klinik Anda
              </p>
            </div>
          </div>

          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-on-surface">Pengaturan</CardTitle>
                  <CardDescription className="text-on-surface-variant">Informasi dasar klinik</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!canEdit && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-sm">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>Hanya Admin Klinik yang dapat mengedit pengaturan.</span>
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="clinic_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-on-surface font-semibold">Nama Klinik</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!canEdit} className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-on-surface font-semibold">Alamat</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!canEdit} className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-on-surface font-semibold">Nomor Telepon</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!canEdit} className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-on-surface font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={!canEdit} className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-on-surface font-semibold">Bahasa</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}>
                          <FormControl>
                            <SelectTrigger className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30">
                              <SelectValue placeholder="Pilih bahasa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="id">Bahasa Indonesia</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {canEdit && (
                    <Button type="submit" disabled={isUpdating} variant="medical" className="gap-2">
                      {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Settings;
