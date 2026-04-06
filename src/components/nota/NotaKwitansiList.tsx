import { useState } from 'react';
import { Eye, Printer, Trash2, Send } from 'lucide-react';
import { useNotaKwitansi } from '@/hooks/useNotaKwitansi';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotaKwitansiPrint } from './NotaKwitansiPrint';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Tunai: 'Tunai',
  Debit: 'Debit',
  QRIS: 'QRIS',
  Transfer: 'Transfer',
  BPJS: 'BPJS',
  Asuransi: 'Asuransi',
};

export const NotaKwitansiList = () => {
  const { notas, isLoading, deleteNota } = useNotaKwitansi();
  const { settings } = useClinicSettings();
  const { toast } = useToast();

  const [previewNota, setPreviewNota] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = (nota: any) => {
    setPreviewNota(nota);
    setPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus nota ini?')) return;
    try {
      await deleteNota(id);
      toast({ title: 'Dihapus', description: 'Nota berhasil dihapus' });
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const handleSendEmail = async (nota: any) => {
    toast({ title: 'Mengirim...', description: 'Fitur kirim email nota sedang dikembangkan' });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Memuat...</div>;
  }

  if (!notas || notas.length === 0) {
    return (
      <Card className="bg-[hsl(0,0%,100%)]">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Belum ada nota/kwitansi yang dibuat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">No</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">No. Nota</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Pasien</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Jumlah</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Pembayaran</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Tanggal</th>
              <th className="text-right py-3 px-3 font-bold text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((nota, idx) => (
              <tr key={nota.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                <td className="py-3 px-3 text-muted-foreground">{idx + 1}</td>
                <td className="py-3 px-3 font-mono text-xs">{nota.invoice_number || nota.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3 px-3 font-medium">{nota.patient_name || nota.patients?.full_name || '-'}</td>
                <td className="py-3 px-3 font-bold">Rp {(nota.amount_final || 0).toLocaleString('id-ID')}</td>
                <td className="py-3 px-3">
                  <Badge variant="outline">{PAYMENT_METHOD_LABELS[nota.payment_method] || nota.payment_method}</Badge>
                </td>
                <td className="py-3 px-3">
                  {nota.created_at
                    ? new Date(nota.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-'}
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(nota)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setPreviewNota(nota); setPreviewOpen(true); }}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSendEmail(nota)}>
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(nota.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-[hsl(0,0%,100%)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">Preview Nota</DialogTitle>
          </DialogHeader>
          {previewNota && (
            <NotaKwitansiPrint nota={previewNota} settings={settings || {}} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
