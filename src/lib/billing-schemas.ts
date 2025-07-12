
import { z } from 'zod';

export const invoiceItemSchema = z.object({
  item_type: z.enum(['service', 'product']),
  item_name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  total_price: z.number().min(0, 'Total price must be positive'),
});

export const invoiceSchema = z.object({
  appointment_id: z.string().uuid('Please select an appointment'),
  service_charge: z.number().min(0, 'Service charge must be positive'),
  tax_rate: z.number().min(0).max(100, 'Tax rate must be between 0-100%'),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  additional_items: z.array(invoiceItemSchema).optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
