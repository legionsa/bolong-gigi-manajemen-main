import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { User } from 'lucide-react'

interface Doctor {
  id: string
  full_name: string
  role_name: string
  avatar_url: string | null
}

interface DoctorSelectorProps {
  value: string
  onChange: (doctorId: string) => void
  className?: string
}

export function DoctorSelector({ value, onChange, className = '' }: DoctorSelectorProps) {
  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', 'for-booking'],
    queryFn: async (): Promise<Doctor[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role_name', 'Dentist')
        .order('full_name')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Pilih Dokter
        </CardTitle>
        <CardDescription>
          Pilih dokter gigi yang Anda inginkan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
          {doctors?.map((doctor) => (
            <div key={doctor.id}>
              <RadioGroupItem
                value={doctor.id}
                id={doctor.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={doctor.id}
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  value === doctor.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">drg. {doctor.full_name}</p>
                      <p className="text-sm text-gray-500">{doctor.role_name}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      value === doctor.id
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {value === doctor.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {!doctors || doctors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada dokter tersedia</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}