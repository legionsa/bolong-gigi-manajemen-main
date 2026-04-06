import { useState } from 'react';
import { Eye, Printer, Trash2 } from 'lucide-react';
import { useSuratIzin } from '@/hooks/useSuratIzin';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SuratIzinPrint } from './SuratIzinPrint';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' },
  signed: { label: 'Ditandatangani', className: 'bg-green-100 text-green-800' },
  printed: { label: 'Dicetak', className: 'bg-blue-100 text-blue-800' },
};

export const SuratIzinList = () => {
  const { documents, isLoadingDocuments, deleteDocument } = useSuratIzin();
  const { settings } = useClinicSettings();
  const { user } = useAuth();
  const { toast } = useToast();

  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = (doc: any) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus surat izin ini?')) return;
    try {
      await deleteDocument(id);
      toast({ title: 'Dihapus', description: 'Surat izin berhasil dihapus' });
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoadingDocuments) {
    return <div className="text-center py-8 text-muted-foreground">Memuat...</div>;
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="bg-[hsl(0,0%,100%)]">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Belum ada surat izin yang dibuat</p>
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
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Nama Pasien</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Kode ICD-10</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Deskripsi</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Dokter</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Tanggal</th>
              <th className="text-left py-3 px-3 font-bold text-muted-foreground">Status</th>
              <th className="text-right py-3 px-3 font-bold text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => {
              const statusCfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              return (
                <tr key={doc.id} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                  <td className="py-3 px-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-3 px-3 font-medium">{doc.patient_name}</td>
                  <td className="py-3 px-3 font-mono text-blue-700 text-xs">{doc.icd10_code || '-'}</td>
                  <td className="py-3 px-3 text-xs max-w-[200px] truncate">{doc.icd10_desc || doc.diagnosis || '-'}</td>
                  <td className="py-3 px-3">{doc.signature_name || '-'}</td>
                  <td className="py-3 px-3">
                    {doc.letter_date
                      ? new Date(doc.letter_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '-'}
                  </td>
                  <td className="py-3 px-3">
                    <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setPreviewDoc(doc); setPreviewOpen(true); }}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-[hsl(0,0%,100%)] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">Preview Surat Izin</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <SuratIzinPrint
              document={previewDoc}
              settings={settings || {}}
              doctor={user ? { full_name: user.user_metadata?.full_name || '' } : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
