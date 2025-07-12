
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema, InvoiceFormData } from '@/lib/billing-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { useItems } from '@/hooks/useItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
  isLoading?: boolean;
}

export const InvoiceForm = ({ onSubmit, isLoading }: InvoiceFormProps) => {
  const { appointments } = useAppointments();
  const { services } = useServices();
  const { items } = useItems();
  
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      service_charge: 0,
      tax_rate: 10,
      payment_method: '',
      notes: '',
      additional_items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additional_items',
  });

  const watchedItems = form.watch('additional_items');

  // Calculate total for each item when quantity or unit price changes
  useEffect(() => {
    watchedItems?.forEach((item, index) => {
      const total = (item.quantity || 0) * (item.unit_price || 0);
      form.setValue(`additional_items.${index}.total_price`, total);
    });
  }, [watchedItems, form]);

  const addItem = () => {
    append({
      item_type: 'service',
      item_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    });
  };

  const addPredefinedService = (service: any) => {
    append({
      item_type: 'service',
      item_name: service.name,
      quantity: 1,
      unit_price: service.price,
      total_price: service.price,
    });
  };

  const addPredefinedItem = (item: any) => {
    append({
      item_type: 'product',
      item_name: item.name,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
    });
  };

  // Filter only completed appointments for invoice creation
  const availableAppointments = appointments?.filter(apt => apt.status === 'Selesai') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="appointment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Appointment</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a completed appointment" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          {appointment.patient_name} - {appointment.service_name} ({new Date(appointment.appointment_date_time).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="service_charge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Charge (Rp)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Additional Items
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Item
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Quick Add Services */}
            {services && services.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Quick Add Services:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((service) => (
                    <Button
                      key={service.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPredefinedService(service)}
                    >
                      {service.name} (Rp {service.price.toLocaleString()})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Items */}
            {items && items.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Quick Add Items:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {items.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPredefinedItem(item)}
                    >
                      {item.name} (Rp {item.price.toLocaleString()})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {fields.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No additional items added</p>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`additional_items.${index}.item_type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="product">Product</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`additional_items.${index}.item_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter item name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`additional_items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`additional_items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price (Rp)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="text-right">
                      <Label>Total: Rp {(watchedItems?.[index]?.total_price || 0).toLocaleString()}</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                      <SelectItem value="debit">Debit Card</SelectItem>
                      <SelectItem value="credit">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Additional notes for the invoice" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </form>
    </Form>
  );
};
