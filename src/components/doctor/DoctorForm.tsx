import { useForm } from "react-hook-form";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export function DoctorForm({ initialData, onSubmit, submitting }) {
  const form = useForm({
    defaultValues: {
      full_name: initialData?.full_name || "",
      email: initialData?.email || "",
      role_name: initialData?.role_name || "Dentist",
    },
  });

  return (
    <Form {...form}>
      <form
        id="doctor-form"
        onSubmit={form.handleSubmit((data) => {
          onSubmit({ ...initialData, ...data });
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input {...field} required />
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
                <Input {...field} required type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* role_name is set in the submit handler, so this is not needed. */}

        <DialogFooter>
          <Button type="submit" form="doctor-form" className="bg-purple-600 hover:bg-purple-700 text-white w-full" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
