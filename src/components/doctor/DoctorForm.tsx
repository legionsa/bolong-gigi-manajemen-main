import { useState } from "react";
import { useForm } from "react-hook-form";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";

const TITLE_OPTIONS = [
  { value: '', label: 'Pilih Title' },
  { value: 'dr.', label: 'dr.' },
  { value: 'drg.', label: 'drg.' },
  { value: 'Prof. Dr. dr', label: 'Prof. Dr. dr' },
  { value: 'Prof. dr', label: 'Prof. dr' },
  { value: 'Dr. dr', label: 'Dr. dr' },
];

const SPECIALIST_OPTIONS = [
  { value: '', label: 'Pilih Gelar Spesialis (opsional)' },
  { value: 'Sp.BM', label: 'Sp.BM (Bedah Mulut)' },
  { value: 'Sp.Ort', label: 'Sp.Ort (Ortodonti)' },
  { value: 'Sp.KG', label: 'Sp.KG (Kedokteran Gigi)' },
  { value: 'Sp.KA', label: 'Sp.KA (Kesehatan Anak)' },
  { value: 'Sp.Perio', label: 'Sp.Perio (Periodonsia)' },
  { value: 'Sp.Prostodo', label: 'Sp.Prostodo (Prostodonti)' },
  { value: 'Sp.Endodo', label: 'Sp.Endodo (Endodonti)' },
  { value: 'M.Kes', label: 'M.Kes (Magister Kesehatan)' },
  { value: 'S.KG', label: 'S.KG (Sarjana Kedokteran Gigi)' },
];

export function DoctorForm({ initialData, onSubmit, submitting }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [specialist, setSpecialist] = useState(initialData?.specialist || '');

  const form = useForm({
    defaultValues: {
      full_name: initialData?.full_name || "",
      email: initialData?.email || "",
      role_name: initialData?.role_name || "Dentist",
    },
  });

  const handleSubmit = (data) => {
    const fullNameWithTitle = title
      ? `${title} ${data.full_name}${specialist ? ', ' + specialist : ''}`
      : `${data.full_name}${specialist ? ', ' + specialist : ''}`;
    onSubmit({ ...initialData, ...data, full_name: fullNameWithTitle, title, specialist });
  };

  return (
    <Form {...form}>
      <form
        id="doctor-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="doctor-title" className="font-semibold text-on-surface">Title</Label>
          <select
            id="doctor-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-white border border-outline text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none"
          >
            {TITLE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-on-surface">Nama Lengkap</FormLabel>
              <FormControl>
                <Input {...field} required placeholder="Nama lengkap dokter" className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="doctor-specialist" className="font-semibold text-on-surface">Gelar Spesialis</Label>
          <select
            id="doctor-specialist"
            value={specialist}
            onChange={e => setSpecialist(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-white border border-outline text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none"
          >
            {SPECIALIST_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-semibold text-on-surface">Email</FormLabel>
              <FormControl>
                <Input {...field} required type="email" placeholder="dokter@klinik.com" className="bg-white border border-outline rounded-xl h-12 focus:ring-2 focus:ring-primary/30" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="submit"
            form="doctor-form"
            disabled={submitting}
            className="w-full medical-gradient text-white"
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
