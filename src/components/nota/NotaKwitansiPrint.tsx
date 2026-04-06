import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ClinicSettings {
  clinic_name?: string;
  address?: string;
  phone_number?: string;
  logo_url?: string;
}

interface NotaKwitansiPrintProps {
  nota: {
    id: string;
    invoice_number?: string;
    patient_name: string;
    amount_total: number;
    amount_discount?: number;
    amount_final: number;
    payment_method?: string;
    notes?: string;
    created_at: string;
  };
  settings: ClinicSettings;
}

const formatRupiah = (num: number) =>
  'Rp ' + num.toLocaleString('id-ID');

export const NotaKwitansiPrint = React.forwardRef<HTMLDivElement, NotaKwitansiPrintProps>(
  ({ nota, settings }, ref) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
      window.print();
    };

    const handleDownloadPdf = async () => {
      if (!printRef.current) return;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`nota-${nota.invoice_number || nota.id}-${nota.patient_name}.pdf`);
    };

    const dateStr = nota.created_at
      ? new Date(nota.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

    return (
      <>
        <div className="flex gap-2 mb-4 no-print">
          <Button variant="medical" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Nota
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
            Export PDF
          </Button>
        </div>

        <div
          ref={ref || printRef}
          className="nota-kwitansi-print bg-white p-6 max-w-[80mm] mx-auto"
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: '11pt',
            lineHeight: 1.5,
            color: '#000',
            border: '1px solid #ccc',
          }}
        >
          {/* Clinic Header */}
          <div className="text-center border-b border-dashed border-black pb-2 mb-3">
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-12 mx-auto mb-1 object-contain" />
            )}
            <div className="font-bold text-sm uppercase">{settings.clinic_name || 'KLINIK GIGI'}</div>
            <div className="text-[10pt]">
              {settings.address && <span>{settings.address}<br /></span>}
              {settings.phone_number && <span>Telp: {settings.phone_number}</span>}
            </div>
          </div>

          {/* Nota Header */}
          <div className="text-center border-b border-dashed border-black pb-2 mb-3">
            <div className="font-bold text-sm uppercase">NOTA / KWITANSI</div>
            <div className="text-[10pt]">No: {nota.invoice_number || nota.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[10pt]">Tanggal: {dateStr}</div>
          </div>

          {/* Patient */}
          <div className="text-[11pt] mb-2">
            <div><span className="inline-block w-16">Pasien</span>: {nota.patient_name}</div>
          </div>

          <div className="border-dashed border-t border-black my-2" />

          {/* Amount Details */}
          <div className="text-[11pt]">
            <div className="flex justify-between mb-1">
              <span>Total</span>
              <span>{formatRupiah(nota.amount_total)}</span>
            </div>
            {nota.amount_discount > 0 && (
              <div className="flex justify-between mb-1 text-red-600">
                <span>Diskon</span>
                <span>-{formatRupiah(nota.amount_discount)}</span>
              </div>
            )}
            <div className="border-dashed border-t border-black my-1" />
            <div className="flex justify-between font-bold text-sm">
              <span>JUMLAH</span>
              <span>{formatRupiah(nota.amount_final)}</span>
            </div>
          </div>

          <div className="border-dashed border-t border-black my-2" />

          {/* Payment method */}
          <div className="text-[10pt] mb-3">
            <div className="flex justify-between">
              <span>Pembayaran</span>
              <span className="uppercase">{nota.payment_method || 'Tunai'}</span>
            </div>
          </div>

          {/* Notes */}
          {nota.notes && (
            <div className="text-[10pt] mb-3">
              <div className="font-semibold">Catatan:</div>
              <div>{nota.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-dashed border-black pt-2 mt-2">
            <div className="text-[10pt]">
              Terima kasih atas kepercayaan Anda
            </div>
            <div className="text-[9pt] mt-1">
              {settings.clinic_name} — {dateStr}
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            .nota-kwitansi-print {
              width: 80mm !important;
              max-width: 80mm !important;
              padding: 8mm !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
            }
            body * { visibility: hidden; }
            .nota-kwitansi-print, .nota-kwitansi-print * { visibility: visible; }
            .nota-kwitansi-print { position: fixed; top: 0; left: 0; width: 80mm; }
          }
        `}</style>
      </>
    );
  }
);

NotaKwitansiPrint.displayName = 'NotaKwitansiPrint';
