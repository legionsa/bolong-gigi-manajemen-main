
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useItems } from '@/hooks/useItems';

const itemSchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  description: z.string().optional(),
  price: z.number().min(0, 'Harga harus positif'),
  category: z.string().optional(),
  unit: z.string().default('pcs'),
  stock_quantity: z.number().min(0, 'Stok tidak boleh negatif').default(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: any;
  onClose: () => void;
}

export const ItemForm = ({ item, onClose }: ItemFormProps) => {
  const { toast } = useToast();
  const { addItem, updateItem, adding, updating } = useItems();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: item || {
      name: '',
      description: '',
      price: 0,
      category: '',
      unit: 'pcs',
      stock_quantity: 0,
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    try {
      if (item) {
        await updateItem({ 
          id: item.id, 
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          unit: data.unit,
          stock_quantity: data.stock_quantity
        });
        toast({
          title: 'Berhasil',
          description: 'Data item berhasil diperbarui',
        });
      } else {
        await addItem({
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          unit: data.unit,
          stock_quantity: data.stock_quantity
        });
        toast({
          title: 'Berhasil',
          description: 'Item baru berhasil ditambahkan',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Gagal',
        description: item ? 'Gagal memperbarui data item' : 'Gagal menambahkan item',
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
              <FormLabel>Nama Item</FormLabel>
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
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Satuan</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stock_quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stok</FormLabel>
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
