
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/useServices';

const serviceSchema = z.object({
  name: z.string().min(1, 'Nama layanan wajib diisi'),
  description: z.string().optional(),
  price: z.number().min(0, 'Harga harus positif'),
  category: z.string().optional(),
  duration_minutes: z.number().min(1, 'Durasi minimal 1 menit').default(30),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  service?: any;
  onClose: () => void;
}

export const ServiceForm = ({ service, onClose }: ServiceFormProps) => {
  const { toast } = useToast();
  const { addService, updateService, adding, updating } = useServices();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service || {
      name: '',
      description: '',
      price: 0,
      category: '',
      duration_minutes: 30,
    },
  });

  const onSubmit = async (data: ServiceFormData) => {
    try {
      if (service) {
        await updateService({ 
          id: service.id, 
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          duration_minutes: data.duration_minutes
        });
        toast({
          title: 'Berhasil',
          description: 'Data layanan berhasil diperbarui',
        });
      } else {
        await addService({
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          duration_minutes: data.duration_minutes
        });
        toast({
          title: 'Berhasil',
          description: 'Layanan baru berhasil ditambahkan',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Gagal',
        description: service ? 'Gagal memperbarui data layanan' : 'Gagal menambahkan layanan',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Layanan</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Harga (Rp)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durasi (Menit)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
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
