
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvoiceEditorProps {
  invoice: any;
  onClose: () => void;
}

export const InvoiceEditor = ({ invoice, onClose }: InvoiceEditorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Daftar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Faktur: {invoice.invoice_number}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Editor faktur akan diimplementasikan pada fase berikutnya</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ini akan mencakup pengeditan detail faktur, status pembayaran, dan informasi lainnya
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
