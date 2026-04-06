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
  operational_permit_number?: string;
  clinic_slogan?: string;
}

interface SuratIzinPrintProps {
  document: {
    id: string;
    patient_name: string;
    patient_nik: string;
    patient_address: string;
    diagnosis: string;
    icd10_code: string;
    icd10_desc: string;
    letter_date: string;
    signature_name: string;
    keperluan: string;
    status: string;
  };
  appointment?: {
    appointment_date_time: string;
    service_name: string;
    notes: string;
  };
  doctor?: {
    full_name: string;
    sip?: string;
    str?: string;
  };
  settings: ClinicSettings;
  template?: {
    header_text?: string;
    body_text?: string;
    footer_text?: string;
  };
}

export const SuratIzinPrint = React.forwardRef<HTMLDivElement, SuratIzinPrintProps>(
  ({ document, appointment, doctor, settings, template }, ref) => {
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`surat-izin-${document.patient_name}-${document.letter_date}.pdf`);
    };

    const letterDateFormatted = document.letter_date
      ? new Date(document.letter_date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

    return (
      <>
        <div className="flex gap-2 mb-4 no-print">
          <Button variant="medical" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Surat
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
            Export PDF
          </Button>
        </div>

        <div
          ref={ref || printRef}
          className="surat-izin-print bg-white p-8 max-w-[210mm] mx-auto"
          style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: '12pt',
            lineHeight: 1.6,
            color: '#000',
          }}
        >
          {/* Clinic Header */}
          <div className="text-center border-b-2 border-black pb-3 mb-6">
            {settings.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo Klinik"
                className="h-16 mx-auto mb-2 object-contain"
              />
            )}
            <div className="font-bold text-base uppercase tracking-wide">
              {settings.clinic_name || 'KLINIK GIGI'}
            </div>
            <div className="text-sm mt-1">
              {settings.address && <span>{settings.address}<br /></span>}
              {settings.phone_number && <span>Telp: {settings.phone_number}<br /></span>}
              {settings.operational_permit_number && (
                <span className="font-semibold">
                  No. Izin Operasional: {settings.operational_permit_number}
                </span>
              )}
            </div>
          </div>

          {/* Letter Title */}
          <div className="text-center font-bold text-sm uppercase mb-6 underline underline-offset-4">
            SURAT IZIN PERAWATAN GIGI
          </div>

          {/* Letter Body */}
          <div className="text-sm mb-4">
            <p className="mb-4">
              Yang bertanda tangan di bawah ini, Dokter Gigi yang praktik di{' '}
              <strong>{settings.clinic_name || 'Klinik'}</strong>, dengan ini menyatakan bahwa:
            </p>

            <table className="text-sm mb-4" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '140px', verticalAlign: 'top' }}>Nama Pasien</td>
                  <td style={{ width: '10px', verticalAlign: 'top' }}>: </td>
                  <td><strong>{document.patient_name}</strong></td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>NIK (No. KTP)</td>
                  <td style={{ verticalAlign: 'top' }}>: </td>
                  <td>{document.patient_nik || '-'}</td>
                </tr>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>Alamat</td>
                  <td style={{ verticalAlign: 'top' }}>: </td>
                  <td>{document.patient_address || '-'}</td>
                </tr>
              </tbody>
            </table>

            <p className="mb-4">
              telah melakukan pemeriksaan dan/atau perawatan kesehatan gigi dan mulut pada tanggal{' '}
              <strong>{letterDateFormatted}</strong>.
            </p>

            {(document.icd10_code || document.diagnosis) && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
                <p className="mb-1">
                  <strong>Diagnosis:</strong>
                </p>
                {document.icd10_code && (
                  <p className="mb-1">
                    Kode ICD-10-CM: <strong>{document.icd10_code}</strong> — {document.icd10_desc || document.diagnosis}
                  </p>
                )}
                {!document.icd10_code && document.diagnosis && (
                  <p>{document.diagnosis}</p>
                )}
              </div>
            )}

            {document.keperluan && (
              <p className="mb-4">
                Berdasarkan pemeriksaan tersebut, pasien tersebut di atas{' '}
                <strong>diperbolehkan untuk {document.keperluan}</strong>.
              </p>
            )}

            <p className="mb-4">
              Surat izin ini diberikan untuk keperluan: <strong>{document.keperluan || 'Administrasi'}</strong> dan dapat digunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Signature */}
          <div className="flex justify-end mt-8">
            <div className="text-center" style={{ minWidth: '180px' }}>
              <p className="text-sm mb-1">{settings.clinic_name || 'Klinik'}, {letterDateFormatted}</p>
              <p className="text-sm mb-12">Dokter Gigi yang merawat,</p>

              {document.signature_name ? (
                <div className="border-t border-black pt-1">
                  <p className="font-bold text-sm">{document.signature_name}</p>
                </div>
              ) : (
                <div className="pt-12 border-t border-black">
                  <p className="text-sm text-gray-500">( Tanda Tangan )</p>
                </div>
              )}

              {doctor && (
                <div className="mt-2 text-xs text-left">
                  <p>drg. {doctor.full_name}</p>
                  {doctor.sip && <p>SIP: {doctor.sip}</p>}
                  {doctor.str && <p>STR: {doctor.str}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-xs text-center text-gray-600">
            {settings.clinic_slogan && <p className="mb-1">{settings.clinic_slogan}</p>}
            <p>
              {settings.clinic_name} — Dicetak pada {new Date().toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            .surat-izin-print {
              width: 210mm !important;
              min-height: 297mm !important;
              padding: 15mm !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
            }
            body * { visibility: hidden; }
            .surat-izin-print, .surat-izin-print * { visibility: visible; }
            .surat-izin-print { position: fixed; top: 0; left: 0; width: 100%; }
          }
        `}</style>
      </>
    );
  }
);

SuratIzinPrint.displayName = 'SuratIzinPrint';
