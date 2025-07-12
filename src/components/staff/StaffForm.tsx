
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useStaff } from '@/hooks/useStaff';

const staffSchema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid'),
  phone_number: z.string().min(1, 'Nomor telepon wajib diisi'),
  role_name: z.enum(['Super Admin', 'Admin', 'Receptionist', 'Dentist', 'Assistant']),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  staff?: any;
  onClose: () => void;
}

export const StaffForm = ({ staff, onClose }: StaffFormProps) => {
  const { toast } = useToast();
  const { addStaff, updateStaff, adding, updating } = useStaff();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: staff || {
      full_name: '',
      email: '',
      phone_number: '',
      role_name: 'Assistant',
    },
  });

  const onSubmit = async (data: StaffFormData) => {
    try {
      if (staff) {
        await updateStaff({ 
          id: staff.id,
          full_name: data.full_name,
          email: data.email,
          phone_number: data.phone_number,
          role_name: data.role_name
        });
        toast({
          title: 'Berhasil',
          description: 'Data staff berhasil diperbarui',
        });
      } else {
        await addStaff({
          full_name: data.full_name,
          email: data.email,
          phone_number: data.phone_number,
          role_name: data.role_name
        });
        toast({
          title: 'Berhasil',
          description: 'Staff baru berhasil ditambahkan',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Gagal',
        description: staff ? 'Gagal memperbarui data staff' : 'Gagal menambahkan staff',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
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
              <FormLabel>Nomor Telepon</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Peran</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Receptionist">Receptionist</SelectItem>
                  <SelectItem value="Dentist">Dentist</SelectItem>
                  <SelectItem value="Assistant">Assistant</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={adding || updating}>
            {adding || updating ? 'Menyimpan...' : 'Simpan'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
        </div>
      </form>
    </Form>
  );
};
