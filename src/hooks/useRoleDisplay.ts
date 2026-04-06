import { Shield, Stethoscope, Receipt, Users } from 'lucide-react';

export type RoleKey = 'superadmin' | 'clinic_admin' | 'admin' | 'doctor' | 'finance' | 'front_desk';

export interface RoleDisplay {
  label: string;
  labelShort: string;
  icon: React.ElementType;
  color: string;
}

const ROLE_DISPLAY: Record<RoleKey, RoleDisplay> = {
  superadmin: { label: 'Super Admin', labelShort: 'Super', icon: Shield, color: 'text-red-500' },
  clinic_admin: { label: 'Admin Klinik', labelShort: 'Admin', icon: Shield, color: 'text-primary' },
  admin: { label: 'Admin Klinik', labelShort: 'Admin', icon: Shield, color: 'text-primary' },
  doctor: { label: 'Dokter', labelShort: 'Dr', icon: Stethoscope, color: 'text-blue-500' },
  finance: { label: 'Finance', labelShort: 'Fin', icon: Receipt, color: 'text-teal-500' },
  front_desk: { label: 'Resepsionis', labelShort: 'FD', icon: Users, color: 'text-purple-500' },
};

export function useRoleDisplay(role?: string | null): RoleDisplay {
  if (!role) return { label: 'Staf', labelShort: 'Staf', icon: Users, color: 'text-muted-foreground' };
  return ROLE_DISPLAY[role as RoleKey] || { label: role, labelShort: role, icon: Users, color: 'text-muted-foreground' };
}
