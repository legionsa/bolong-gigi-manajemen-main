
import { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Send, Edit, Shield, RefreshCw } from 'lucide-react';
import { InvoiceViewer } from './InvoiceViewer';
import { InvoiceEditor } from './InvoiceEditor';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface InvoiceListProps {
  onEdit: (invoice: any) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ onEdit }) => {
  const { invoices, isLoading } = useInvoices();
  const [viewingInvoice, setViewingInvoice] = useState(null);
  // const [editingInvoice, setEditingInvoice] = useState(null); // Editing state will be handled by parent
  const { toast } = useToast();

  // BPJS dialog state
  const [bpjsDialogOpen, setBpjsDialogOpen] = useState(false);
  const [selectedInvoiceForBpjs, setSelectedInvoiceForBpjs] = useState<any>(null);
  const [isSubmittingBpjs, setIsSubmittingBpjs] = useState(false);

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

  const handleSubmitToBpjs = (invoice: any) => {
    setSelectedInvoiceForBpjs(invoice);
    setBpjsDialogOpen(true);
  };

  const confirmSubmitToBpjs = async () => {
    if (!selectedInvoiceForBpjs) return;

    setIsSubmittingBpjs(true);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Unauthorized', variant: 'destructive' });
        return;
      }

      // Call bpjs-submit-claim edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const response = await fetch(`${supabaseUrl}/functions/v1/bpjs-submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_sep',
          appointment_id: selectedInvoiceForBpjs.appointment_id,
          clinic_id: selectedInvoiceForBpjs.clinic_id,
          patient_id: selectedInvoiceForBpjs.patient_id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to submit claim');
      }

      toast({
        title: 'Berhasil',
        description: `Klaim berhasil disubmit. SEP: ${result.data.sep_no}`,
      });

      setBpjsDialogOpen(false);
      setSelectedInvoiceForBpjs(null);
    } catch (error: any) {
      toast({
        title: 'Gagal Submit BPJS',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingBpjs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-600 hover:text-blue-700"
                  onClick={() => handleSubmitToBpjs(invoice)}
                >
                  <Shield className="w-4 h-4" />
                  BPJS
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Submit to BPJS Dialog */}
      <Dialog open={bpjsDialogOpen} onOpenChange={setBpjsDialogOpen}>
        <DialogContent className="bg-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Submit ke BPJS
            </DialogTitle>
            <DialogDescription>
              Buat klaim BPJS P-Care dari faktur ini
            </DialogDescription>
          </DialogHeader>
          {selectedInvoiceForBpjs && (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-container-low p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Faktur</span>
                  <span className="font-medium">{selectedInvoiceForBpjs.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pasien</span>
                  <span className="font-medium">{selectedInvoiceForBpjs.patient_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Jumlah</span>
                  <span className="font-mono font-medium">Rp {selectedInvoiceForBpjs.total_amount?.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-700">
                  Klaim akan disubmit ke BPJS P-Care. Pastikan pasien memiliki BPJS aktif.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBpjsDialogOpen(false)} disabled={isSubmittingBpjs}>
              Batal
            </Button>
            <Button
              variant="medical"
              onClick={confirmSubmitToBpjs}
              disabled={isSubmittingBpjs}
              className="gap-2"
            >
              {isSubmittingBpjs ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menyubmit...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Submit Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
