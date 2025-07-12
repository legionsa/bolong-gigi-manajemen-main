
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "./AvatarUpload";
import { Skeleton } from "@/components/ui/skeleton";

const profileFormSchema = z.object({
  email: z.string().email().optional(), // Added email for display
  role_name: z.string().optional(), // Added role_name for display
  full_name: z.string().min(2, { message: "Nama lengkap harus memiliki setidaknya 2 karakter." }),
  phone_number: z.string().optional(), // Added phone_number
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileForm = () => {
  const { userProfile, isLoadingProfile, updateUserProfile, isUpdatingProfile } = useUserProfile();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        full_name: userProfile.full_name || "",
        email: userProfile.email || "",
        role_name: userProfile.role_name || "",
        phone_number: userProfile.phone_number || "", // Added phone_number
      });
    }
  }, [userProfile, form]);

  async function onSubmit(data: ProfileFormValues) {
    try {
      await updateUserProfile({ 
        full_name: data.full_name,
        phone_number: data.phone_number // Added phone_number
      });
      toast({
        title: "Profil Diperbarui",
        description: "Informasi profil Anda telah berhasil diperbarui.",
      });
    } catch (error) {
      toast({
        title: "Gagal Memperbarui Profil",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AvatarUpload />

      {/* Display user email */}
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Email
        </label>
        <Input 
          value={userProfile?.email || ''} 
          disabled 
          className="bg-gray-100 cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
      </div>
      
      {/* Display user role */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-sm text-blue-900 mb-1">Peran Pengguna</h3>
        <p className="text-blue-800 font-medium">{userProfile?.role_name || 'Tidak tersedia'}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Email field is now displayed above the form */}
          {/* The div and label for Email within the form were removed as email is displayed read-only above. */}
            <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Nama Lengkap Anda" {...field} />
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
                  <Input placeholder="Nomor Telepon Anda" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isUpdatingProfile}>
            {isUpdatingProfile ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ProfileForm;
