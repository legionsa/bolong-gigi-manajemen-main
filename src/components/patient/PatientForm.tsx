
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { Edit } from 'lucide-react';

export const PatientForm = ({ onSubmit, initialData }) => {
  const [isPatientNumberEditable, setIsPatientNumberEditable] = useState(!initialData);
  const form = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      patient_number: '',
      full_name: '',
      nik: '',
      phone_number: '',
      email: '',
      address: '',
      place_of_birth: '',
      date_of_birth: '',
      gender: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        date_of_birth: initialData.date_of_birth ? initialData.date_of_birth.split('T')[0] : '',
      });
      setIsPatientNumberEditable(false);
    } else {
      form.reset({
        patient_number: '',
        full_name: '',
        nik: '',
        phone_number: '',
        email: '',
        address: '',
        place_of_birth: '',
        date_of_birth: '',
        gender: undefined,
      });
      setIsPatientNumberEditable(true);
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form id="patient-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="patient_number"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="patient_number">No. Pasien</Label>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    id="patient_number"
                    {...field}
                    placeholder={initialData ? "No. Pasien" : "Masukkan No. Pasien (contoh: CLN00000001)"}
                    readOnly={!isPatientNumberEditable}
                    className={!isPatientNumberEditable ? "bg-gray-100" : ""}
                  />
                </FormControl>
                {initialData && !isPatientNumberEditable && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsPatientNumberEditable(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <FormControl>
                <Input id="full_name" placeholder="Contoh: Budi Santoso" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="place_of_birth"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="place_of_birth">Tempat Lahir</Label>
                <FormControl>
                  <Input id="place_of_birth" placeholder="Contoh: Jakarta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
                <FormControl>
                  <Input id="date_of_birth" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nik"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="nik">NIK</Label>
              <FormControl>
                <Input id="nik" placeholder="16 digit NIK" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="gender">Jenis Kelamin</Label>
               <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="Perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="phone_number">No. Telepon</Label>
              <FormControl>
                <Input id="phone_number" placeholder="0812-xxxx-xxxx" {...field} />
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
              <Label htmlFor="email">Email (Opsional)</Label>
              <FormControl>
                <Input id="email" type="email" placeholder="email@domain.com" {...field} />
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
              <Label htmlFor="address">Alamat</Label>
              <FormControl>
                <Input id="address" placeholder="Jl. Contoh No. 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
