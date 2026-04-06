
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceForm } from './billing/InvoiceForm';
import { InvoiceList } from './billing/InvoiceList';
import { ServiceList } from './services/ServiceList';
import { ItemList } from './items/ItemList';
import { useInvoices } from '@/hooks/useInvoices';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { InvoiceFormData } from '@/lib/billing-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export const BillingManagement = () => {
  const [activeTab, setActiveTab] = useState('create');
  const { createInvoice, isCreating, invoices, updateInvoice, isLoading: isInvoicesLoading } = useInvoices();
  const [editingInvoice, setEditingInvoice] = useState<(InvoiceFormData & { id: string; invoice_number: string; }) | null>(null);
  const { toast } = useToast();
  const { can } = usePermissions();

  const handleCreateInvoice = async (data: InvoiceFormData) => {
    try {
      console.log('Data form dikirim:', data);
      await createInvoice(data);
      toast({
        title: 'Berhasil',
        description: 'Faktur berhasil dibuat',
      });
      setActiveTab('list');
    } catch (error) {
      console.error('Error saat membuat faktur:', error);
      toast({
        title: 'Gagal',
        description: 'Gagal membuat faktur',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">Manajemen Tagihan</h1>
        <p className="text-on-surface-variant mt-1">Buat dan kelola faktur, layanan, dan item untuk pasien Anda</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto gap-1">
          <TabsTrigger value="create" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Buat Faktur</TabsTrigger>
          <TabsTrigger value="list" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Daftar Faktur</TabsTrigger>
          {can('billing.edit') && (
            <>
              <TabsTrigger value="edit-invoice" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Edit Faktur</TabsTrigger>
              <TabsTrigger value="invoice-layout-editor" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Editor Tampilan</TabsTrigger>
            </>
          )}
          <TabsTrigger value="services" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Layanan</TabsTrigger>
          <TabsTrigger value="items" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Item</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Buat Faktur Baru</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceForm onSubmit={handleCreateInvoice} isLoading={isCreating} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-layout-editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Editor Tampilan Faktur</CardTitle>
            </CardHeader>
            <CardContent>
              <p>WYSIWYG editor untuk tampilan email faktur akan diimplementasikan di sini.</p>
              {/* Placeholder for WYSIWYG editor */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <InvoiceList onEdit={(invoice: any) => { 
            setEditingInvoice({ ...invoice, patient_id: invoice.patient_id?.id || '', doctor_id: invoice.doctor_id?.id || '', invoice_number: invoice.invoice_number || '' }); 
            setActiveTab('edit-invoice'); 
          }} />
          {/* TODO: Define proper type for invoice in onEdit once InvoiceList's data structure is clear */}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServiceList />
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <ItemList />
        </TabsContent>

        <TabsContent value="edit-invoice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Faktur</CardTitle>
            </CardHeader>
            <CardContent>
              {editingInvoice ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editingInvoice) return;
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, ...updateData } = editingInvoice;
                    await updateInvoice({ id: editingInvoice.id, updates: updateData });
                    toast({
                      title: 'Berhasil',
                      description: 'Faktur berhasil diperbarui.',
                    });
                    setEditingInvoice(null);
                    setActiveTab('list');
                  } catch (error) {
                    console.error('Error updating invoice:', error);
                    toast({
                      title: 'Gagal',
                      description: 'Gagal memperbarui faktur.',
                      variant: 'destructive',
                    });
                  }
                }} className="space-y-4">
                  <div>
                    <label htmlFor="invoice_number">Nomor Faktur</label>
                    <Input id="invoice_number" value={editingInvoice.invoice_number || ''} onChange={(e) => setEditingInvoice(prev => prev ? {...prev, invoice_number: e.target.value} : null)} />
                  </div>
                  <div>
                    <label htmlFor="notes">Catatan</label>
                    <Textarea id="notes" value={editingInvoice.notes || ''} onChange={(e) => setEditingInvoice({...editingInvoice, notes: e.target.value})} />
                  </div>
                  {/* Add other editable fields as needed */}
                  <div className="flex justify-end space-x-2">
                    <Button type="submit" disabled={isCreating}>Simpan Perubahan</Button>
                    <Button variant="outline" onClick={() => {
                      // Placeholder for Supabase email sending
                      // const patientEmail = invoices?.find(inv => inv.id === editingInvoice.id)?.patients?.email;
                      // if (patientEmail) {
                      //   supabase.functions.invoke('send-invoice-email', {
                      //     body: { invoiceId: editingInvoice.id, recipientEmail: patientEmail }
                      //   }).then(() => {
                      //     toast({ title: 'Email Terkirim', description: `Faktur telah dikirim ke ${patientEmail}` });
                      //   }).catch(err => {
                      //     toast({ title: 'Gagal Mengirim Email', description: err.message, variant: 'destructive' });
                      //   });
                      // } else {
                      //   toast({ title: 'Gagal Mengirim Email', description: 'Email pasien tidak ditemukan.', variant: 'destructive' });
                      // }
                      toast({ title: 'Fitur Segera Hadir', description: 'Pengiriman email faktur akan segera diimplementasikan.'});
                    }}>Kirim ke Pasien</Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Pilih faktur dari daftar untuk diedit.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
