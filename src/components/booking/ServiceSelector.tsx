import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Stethoscope } from 'lucide-react'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
  description: string | null
}

interface ServiceSelectorProps {
  value: string
  onChange: (serviceId: string) => void
  className?: string
}

export function ServiceSelector({ value, onChange, className = '' }: ServiceSelectorProps) {
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'for-booking'],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name')

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
          <Stethoscope className="w-5 h-5" />
          Pilih Layanan
        </CardTitle>
        <CardDescription>
          Pilih layanan perawatan gigi yang Anda butuhkan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
          {services?.map((service) => (
            <div key={service.id}>
              <RadioGroupItem
                value={service.id}
                id={service.id}
                className="peer sr-only"
              />
              <Label
                htmlFor={service.id}
                className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  value === service.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-gray-500">{service.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{service.duration_minutes} menit</span>
                      {service.price > 0 && (
                        <>
                          <span>-</span>
                          <span className="font-medium text-blue-600">
                            Rp {service.price.toLocaleString('id-ID')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      value === service.id
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {value === service.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {!services || services.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Stethoscope className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada layanan tersedia</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}