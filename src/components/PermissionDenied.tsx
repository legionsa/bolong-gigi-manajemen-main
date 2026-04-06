import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PermissionDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-6">
        <ShieldX className="w-10 h-10 text-error" />
      </div>
      <h2 className="text-2xl font-bold text-on-surface mb-2">Akses Terbatas</h2>
      <p className="text-on-surface-variant max-w-md mb-6">
        Kamu tidak memiliki izin untuk mengakses halaman ini.
        Hubungi admin klinik jika kamu membutuhkan akses.
      </p>
      <Button variant="medical" onClick={() => window.history.back()}>
        Kembali
      </Button>
    </div>
  );
}

export default PermissionDenied;
