
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer } from 'lucide-react';

interface InvoiceViewerProps {
  invoice: any;
  onClose: () => void;
}

export const InvoiceViewer = ({ invoice, onClose }: InvoiceViewerProps) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Mock implementation - in real app would generate PDF
    console.log('Downloading invoice PDF...');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Daftar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">FAKTUR</CardTitle>
          <div className="text-center text-lg font-semibold">{invoice.invoice_number}</div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Informasi Pasien:</h3>
              <p className="font-medium">{invoice.patient_name}</p>
              <p className="text-sm text-muted-foreground">
                Tanggal Kunjungan: {new Date(invoice.appointment_date).toLocaleDateString('id-ID')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Informasi Faktur:</h3>
              <p className="text-sm">Tanggal: {new Date(invoice.created_at).toLocaleDateString('id-ID')}</p>
              <p className="text-sm">Status: {invoice.payment_status}</p>
              {invoice.payment_method && (
                <p className="text-sm">Metode Pembayaran: {invoice.payment_method}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Detail Layanan:</h3>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between">
                <span>{invoice.service_name}</span>
                <span>Rp {invoice.service_charge.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rp {invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak ({invoice.tax_rate}%):</span>
                <span>Rp {invoice.tax_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>Rp {invoice.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h3 className="font-semibold mb-2">Catatan:</h3>
              <p className="text-sm bg-gray-50 p-3 rounded">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
