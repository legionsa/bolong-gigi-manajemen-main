
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { useDoctors } from '@/hooks/useDoctors';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Stethoscope, HeartPulse, Shield, Pill, Droplets, FileCode } from 'lucide-react';
import { Odontogram } from './Odontogram';

export const MedicalRecordViewer = ({ patientId }) => {
  const { data: records, isLoading, error } = useMedicalRecords(patientId);
  const { doctors } = useDoctors();

  // Create a lookup map for doctor names
  const doctorMap = doctors?.reduce((acc, doctor) => {
    acc[doctor.id] = doctor.full_name;
    return acc;
  }, {}) || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Gagal memuat rekam medis: {error.message}</div>;
  }

  if (!records || records.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Belum ada Rekam Medis</h3>
        <p className="text-gray-500">Tidak ada data rekam medis yang ditemukan untuk pasien ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record) => (
        <Card key={record.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Kunjungan: {new Date(record.visit_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Stethoscope className="w-4 h-4" />
                  Diperiksa oleh: {doctorMap[record.doctor_id] || 'Tidak diketahui'}
                </CardDescription>
              </div>
              <Badge variant="outline">Selesai</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Keluhan Utama</h4>
                <p className="text-gray-600">{record.chief_complaint || '-'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Pemeriksaan Fisik</h4>
                <p className="text-gray-600">{record.physical_examination || '-'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Diagnosa</h4>
                <p className="text-gray-600">{record.assessment || '-'}</p>
                 {record.diagnosis_codes && record.diagnosis_codes.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <FileCode className="w-3 h-3"/>
                        <span>ICD-10: {record.diagnosis_codes[0]}</span>
                    </div>
                 )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Rencana Perawatan</h4>
                <p className="text-gray-600">{record.plan || '-'}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
               <h3 className="font-semibold text-md mb-3">Informasi Tambahan</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Droplets className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                        <h4 className="font-semibold text-gray-800">Golongan Darah</h4>
                        <p className="text-gray-600">{record.blood_type || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                        <h4 className="font-semibold text-gray-800">Vaksin COVID-19</h4>
                        <p className="text-gray-600">{record.covid19_vaccinated === null ? '-' : record.covid19_vaccinated ? 'Sudah' : 'Belum'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 col-span-2 md:col-span-3">
                    <HeartPulse className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                        <h4 className="font-semibold text-gray-800">Riwayat Penyakit</h4>
                        <p className="text-gray-600">
                          {record.history_conditions && record.history_conditions.length > 0 ? record.history_conditions.join(', ') : 'Tidak ada'}
                        </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 col-span-2 md:col-span-3">
                    <Pill className="w-4 h-4 mt-1 text-gray-500" />
                    <div>
                        <h4 className="font-semibold text-gray-800">Alergi Obat</h4>
                        <p className="text-gray-600">
                          {record.drug_allergies && record.drug_allergies.length > 0 ? record.drug_allergies.join(', ') : 'Tidak ada'}
                        </p>
                    </div>
                  </div>
               </div>
            </div>

            {record.odontogram_data && Object.keys(record.odontogram_data).length > 0 && (
               <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-md mb-3">Odontogram</h3>
                <Odontogram value={record.odontogram_data} onChange={() => {}} readOnly={true} />
              </div>
            )}

          </CardContent>
        </Card>
      ))}
    </div>
  );
};
