
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AvatarUpload = () => {
    const { userProfile, updateUserProfile } = useUserProfile();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) { // 1MB limit
            toast({
                title: "File terlalu besar",
                description: "Ukuran file tidak boleh melebihi 1MB.",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);

        try {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onloadend = async () => {
                const base64 = fileReader.result as string;
                
                const { data, error } = await supabase.functions.invoke('upload-avatar', {
                    body: { file: base64 },
                });

                if (error) throw error;
                if (data.error) throw new Error(data.error);

                await updateUserProfile({ avatar_url: data.url });

                toast({
                    title: "Foto Profil Diperbarui",
                    description: "Foto profil Anda telah berhasil diubah.",
                });
            };
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast({
                title: "Gagal Mengunggah Foto",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center space-x-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={userProfile?.avatar_url || ''} alt={userProfile?.full_name || ''} />
                <AvatarFallback className="text-3xl">
                    {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
                <Button type="button" onClick={handleAvatarClick} disabled={isUploading}>
                    {isUploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="mr-2 h-4 w-4" />
                    )}
                    {isUploading ? 'Mengunggah...' : 'Ubah Foto'}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG, atau WEBP. Maks 1MB.</p>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
            />
        </div>
    );
};

export default AvatarUpload;
