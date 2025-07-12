
import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicalRecordSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { useDoctors } from '@/hooks/useDoctors';
import { useToast } from '@/hooks/use-toast';
import { Odontogram } from './Odontogram';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X as XIcon, Check as CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const historyConditionsOptions = ['Diabetic', 'Hypertension', 'Haemophilia', 'Hepatitis', 'Gastric', 'HIV/AIDS'];
const commonDrugAllergies = ['Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa', 'Codeine', 'Amoxicillin'];

export const MedicalRecordForm = ({ patientId, onSuccess, onCancel }) => {
  const { doctors, isLoading: isLoadingDoctors } = useDoctors();
  const { addMedicalRecord, isAdding } = useMedicalRecords(patientId);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      patient_id: patientId,
      doctor_id: '',
      visit_date: new Date().toISOString().split('T')[0],
      chief_complaint: '',
      physical_examination: '',
      assessment: '',
      plan: '',
      diagnosis_codes: [],
      blood_type: 'Unknown',
      odontogram_data: {},
      history_conditions: [],
      covid19_vaccinated: null,
      drug_allergies: [],
    },
  });

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      covid19_vaccinated: data.covid19_vaccinated === null ? null : data.covid19_vaccinated,
      odontogram_data: data.odontogram_data || {},
    };

    try {
      await addMedicalRecord(payload);
      toast({ title: 'Sukses', description: 'Rekam medis berhasil ditambahkan.' });
      onSuccess();
    } catch (error) {
      toast({ title: 'Gagal', description: `Gagal menambahkan rekam medis: ${error.message}`, variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form id="medical-record-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="visit_date" render={({ field }) => (
            <FormItem>
              <Label>Tanggal Kunjungan</Label>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="doctor_id" render={({ field }) => (
            <FormItem>
              <Label>Dokter Pemeriksa</Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger disabled={isLoadingDoctors}>
                    <SelectValue placeholder={isLoadingDoctors ? "Memuat dokter..." : "Pilih dokter"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {doctors?.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="chief_complaint" render={({ field }) => (
          <FormItem><Label>Keluhan Utama</Label><FormControl><Textarea placeholder="Contoh: Sakit gigi geraham kanan bawah..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="assessment" render={({ field }) => (
          <FormItem><Label>Diagnosa</Label><FormControl><Textarea placeholder="Contoh: Karies profunda..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField
          control={form.control}
          name="diagnosis_codes"
          render={({ field }) => (
            <FormItem>
              <Label>Kode ICD-10 (Opsional)</Label>
              <FormControl>
                <Input
                  placeholder="Contoh: K02.1"
                  value={field.value?.[0] || ''}
                  onChange={(e) => field.onChange(e.target.value ? [e.target.value] : [])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="plan" render={({ field }) => (
          <FormItem><Label>Rencana Perawatan</Label><FormControl><Textarea placeholder="Contoh: Ekstraksi gigi..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="physical_examination" render={({ field }) => (
          <FormItem><Label>Pemeriksaan Fisik (Opsional)</Label><FormControl><Textarea placeholder="Hasil pemeriksaan fisik..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <h3 className="text-lg font-semibold pt-4 border-t">Informasi Tambahan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="blood_type" render={({ field }) => (
            <FormItem>
              <Label>Golongan Darah</Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Pilih golongan darah" /></SelectTrigger></FormControl>
                <SelectContent>
                  {['A', 'B', 'AB', 'O', 'Unknown'].map(type => <SelectItem key={type} value={type}>{type === 'Unknown' ? 'Tidak Tahu' : type}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="covid19_vaccinated" render={({ field }) => (
            <FormItem><Label>Vaksin COVID-19</Label>
              <FormControl>
                <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} value={field.value?.toString()} className="flex items-center space-x-4">
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="true" /></FormControl><Label className="font-normal">Sudah</Label></FormItem>
                  <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="false" /></FormControl><Label className="font-normal">Belum</Label></FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )} />
        </div>
        
        <FormField control={form.control} name="history_conditions" render={() => (
          <FormItem>
            <Label>Riwayat Penyakit Sistemik</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {historyConditionsOptions.map((item) => (
                <FormField key={item} control={form.control} name="history_conditions" render={({ field }) => (
                  <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                      return checked ? field.onChange([...field.value, item]) : field.onChange(field.value?.filter((value) => value !== item))
                    }} /></FormControl>
                    <Label className="font-normal">{item}</Label>
                  </FormItem>
                )} />
              ))}
            </div>
          </FormItem>
        )} />
        
        <FormField
          control={form.control}
          name="drug_allergies"
          render={({ field }) => {
            const [inputValue, setInputValue] = useState('');
            const [isPopoverOpen, setPopoverOpen] = useState(false);
            const inputRef = useRef<HTMLInputElement>(null);

            const handleSelect = (allergy: string) => {
              if (allergy && !field.value.includes(allergy)) {
                field.onChange([...field.value, allergy]);
              }
              setInputValue('');
              setPopoverOpen(false);
            };

            const handleRemove = (allergy: string) => {
              field.onChange(field.value.filter((a) => a !== allergy));
            };

            const filteredOptions = commonDrugAllergies.filter(
              (option) =>
                !field.value.includes(option) &&
                option.toLowerCase().includes(inputValue.toLowerCase())
            );

            return (
              <FormItem>
                <Label>Alergi Obat</Label>
                <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                        {field.value.map((allergy) => (
                          <Badge key={allergy} variant="secondary">
                            {allergy}
                            <button
                              type="button"
                              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              onClick={() => handleRemove(allergy)}
                            >
                              <XIcon className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        ))}
                         <div className="flex-grow" onClick={() => inputRef.current?.focus()}></div>
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput
                        ref={inputRef}
                        placeholder="Cari atau tambah alergi..."
                        value={inputValue}
                        onValueChange={setInputValue}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && inputValue.trim()) {
                            e.preventDefault();
                            handleSelect(inputValue.trim());
                          }
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {inputValue.trim() && (
                            <CommandItem
                              onSelect={() => handleSelect(inputValue.trim())}
                            >
                              Tambah: "{inputValue.trim()}"
                            </CommandItem>
                          )}
                           {!inputValue.trim() && "Ketik untuk mencari atau menambah."}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredOptions.map((option) => (
                            <CommandItem
                              key={option}
                              onSelect={() => handleSelect(option)}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value.includes(option)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                 <FormDescription>
                  Pilih dari daftar atau ketik untuk menambahkan alergi baru.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        <div className="space-y-2">
          <Label>Odontogram</Label>
          <div className="p-4 border rounded-md bg-gray-50">
            <img src="https://infodrg.com/wp-content/uploads/2020/12/1206D6AF-6FA6-41C5-A2F5-D49B1D86622A.jpeg" alt="Odontogram Example" className="w-full rounded-md" />
            <p className="text-xs text-center text-gray-500 mt-2">Contoh pengisian odontogram.</p>
          </div>
          <FormField
            control={form.control}
            name="odontogram_data"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Odontogram {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit" disabled={isAdding} form="medical-record-form" className="bg-blue-600 hover:bg-blue-700">
            {isAdding ? 'Menyimpan...' : 'Simpan Rekam Medis'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
