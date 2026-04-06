import { useAccountTier } from './useAccountTier';
import { useClinicUser } from './useClinicUser';

export type Permission =
  | 'patients.view' | 'patients.create' | 'patients.edit'
  | 'appointments.view' | 'appointments.create' | 'appointments.manage'
  | 'billing.view' | 'billing.create' | 'billing.edit' | 'billing.mark_paid'
  | 'finance.reports' | 'finance.export'
  | 'medical.records.view' | 'medical.records.edit'
  | 'surat_izin.create'
  | 'staff.invite' | 'staff.manage'
  | 'clinic.settings'
  | 'analytics.view' | 'analytics.full'
  | 'superadmin.access';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: ['superadmin.access', 'patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create', 'appointments.manage', 'billing.view', 'billing.create', 'billing.edit', 'billing.mark_paid', 'finance.reports', 'finance.export', 'medical.records.view', 'medical.records.edit', 'surat_izin.create', 'staff.invite', 'staff.manage', 'clinic.settings', 'analytics.view', 'analytics.full'],
  clinic_admin: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create', 'appointments.manage', 'billing.view', 'billing.create', 'billing.edit', 'billing.mark_paid', 'finance.reports', 'finance.export', 'medical.records.view', 'medical.records.edit', 'surat_izin.create', 'staff.invite', 'staff.manage', 'clinic.settings', 'analytics.view', 'analytics.full'],
  admin: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create', 'appointments.manage', 'billing.view', 'billing.create', 'billing.edit', 'billing.mark_paid', 'finance.reports', 'finance.export', 'medical.records.view', 'medical.records.edit', 'surat_izin.create', 'staff.invite', 'staff.manage', 'clinic.settings', 'analytics.view', 'analytics.full'],
  doctor: ['patients.view', 'appointments.view', 'medical.records.view', 'medical.records.edit', 'surat_izin.create'],
  finance: ['billing.view', 'billing.mark_paid', 'finance.reports', 'finance.export'],
  front_desk: ['patients.view', 'patients.create', 'patients.edit', 'appointments.view', 'appointments.create', 'appointments.manage', 'billing.view', 'billing.create'],
};

export function usePermissions(clinicId?: string | null) {
  const { clinicUser, role, status, permissionsOverride, isLoading: clinicUserLoading } = useClinicUser();
  const { limits, tier, effectiveTier, trialDaysRemaining, isTrial, isPro, isFree } = useAccountTier();

  const can = (permission: Permission): boolean => {
    if (!role) {
      return false;
    }
    if (role === 'superadmin') return true;
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes(permission)) return true;
    // Check override
    if (permissionsOverride?.[permission] !== undefined) {
      return permissionsOverride[permission];
    }
    return false;
  };

  const tierCan = (feature: keyof typeof limits): boolean => {
    if (!limits) return false;
    const val = limits[feature];
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    return false;
  };

  const isWithinLimit = (limitKey: string, currentCount: number): boolean => {
    if (!limits) return true;
    const limitMap: Record<string, number> = {
      max_doctors_per_clinic: limits.max_doctors_per_clinic,
      max_front_desk_per_clinic: limits.max_front_desk_per_clinic,
      max_admins_per_clinic: limits.max_admins_per_clinic,
      max_finance_per_clinic: limits.max_finance_per_clinic,
      max_clinics: limits.max_clinics,
    };
    const limit = limitMap[limitKey];
    if (limit === undefined || limit === -1) return true;
    return currentCount < limit;
  };

  const requiresPro = (feature: keyof typeof limits): boolean => {
    if (!limits) return false;
    return false; // caller checks tierCan
  };

  return {
    can,
    tierCan,
    isWithinLimit,
    role,
    status,
    tier,
    effectiveTier,
    limits,
    trialDaysRemaining,
    isTrial,
    isPro,
    isFree,
    requiresPro,
    isLoading: clinicUserLoading,
    // Shortcut booleans
    isAdmin: role === 'admin' || role === 'clinic_admin' || role === 'superadmin',
    isDoctor: role === 'doctor',
    isFinance: role === 'finance',
    isFrontDesk: role === 'front_desk',
  };
}
