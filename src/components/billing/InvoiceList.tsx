
import { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Send, Edit } from 'lucide-react';
import { InvoiceViewer } from './InvoiceViewer';
import { InvoiceEditor } from './InvoiceEditor';
import { useToast } from '@/hooks/use-toast';

interface InvoiceListProps {
  onEdit: (invoice: any) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ onEdit }) => {
  const { invoices, isLoading } = useInvoices();
  const [viewingInvoice, setViewingInvoice] = useState(null);
  // const [editingInvoice, setEditingInvoice] = useState(null); // Editing state will be handled by parent
  const { toast } = useToast();

  const handleView = (invoice: any) => {
    setViewingInvoice(invoice);
  };

  const handleEdit = (invoice: any) => {
    onEdit(invoice); // Call parent's onEdit handler
  };

  const handleSend = async (invoice: any) => {
    // Mock implementation - in real app would send email/SMS
    toast({
      title: 'Faktur Dikirim',
      description: `Faktur ${invoice.invoice_number} berhasil dikirim ke ${invoice.patient_name}`,
    });
  };

  if (isLoading) {
    return <div>Memuat faktur...</div>;
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Belum ada faktur yang dibuat</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Lunas';
      case 'pending':
        return 'Menunggu';
      case 'overdue':
        return 'Terlambat';
      default:
        return status;
    }
  };

  if (viewingInvoice) {
    return (
      <InvoiceViewer 
        invoice={viewingInvoice} 
        onClose={() => setViewingInvoice(null)} 
      />
    );
  }

  // if (editingInvoice) { // Editing UI will be handled by parent
  //   return (
  //     <InvoiceEditor 
  //       invoice={editingInvoice} 
  //       onClose={() => setEditingInvoice(null)} 
  //     />
  //   );
  // }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <Card key={invoice.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {invoice.patient_name} • {invoice.service_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(invoice.appointment_date).toLocaleDateString('id-ID')}
                </p>
              </div>
              <Badge className={getStatusColor(invoice.payment_status)}>
                {getStatusText(invoice.payment_status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">Rp {invoice.total_amount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.payment_method && `Pembayaran: ${invoice.payment_method}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleView(invoice)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Lihat
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(invoice)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSend(invoice)}>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
