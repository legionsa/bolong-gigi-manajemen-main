import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClinicUser } from './useClinicUser';

export const useSuratIzin = () => {
  const queryClient = useQueryClient();
  const { clinicUser } = useClinicUser();
  const clinicId = clinicUser?.clinic_id;

  const fetchDocuments = async () => {
    if (!clinicId) return [];
    const { data, error } = await supabase
      .from('surat_izin_documents')
      .select(`
        *,
        patients:patient_id(full_name, nik, address),
        users:doctor_id(full_name)
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  };

  const fetchTemplates = async () => {
    if (!clinicId) return [];
    const { data, error } = await supabase
      .from('surat_izin_templates')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('is_default', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  };

  const fetchICD10Codes = async (search?: string) => {
    let query = supabase.from('icd10_codes').select('*').order('code');
    if (search) {
      query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
    }
    const { data, error } = await query.limit(50);
    if (error) throw new Error(error.message);
    return data || [];
  };

  const documentsQuery = useQuery({
    queryKey: ['surat-izin-documents', clinicId],
    queryFn: fetchDocuments,
    enabled: !!clinicId,
  });

  const templatesQuery = useQuery({
    queryKey: ['surat-izin-templates', clinicId],
    queryFn: fetchTemplates,
    enabled: !!clinicId,
  });

  const createDocument = async (docData: {
    appointment_id: string;
    patient_id: string;
    doctor_id: string;
    template_id?: string;
    patient_name: string;
    patient_nik: string;
    patient_address: string;
    diagnosis: string;
    icd10_code: string;
    icd10_desc: string;
    letter_date: string;
    keperluan: string;
    signature_name: string;
    status?: string;
  }) => {
    const { data, error } = await supabase
      .from('surat_izin_documents')
      .insert({
        clinic_id: clinicId,
        ...docData,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const updateDocument = async ({ id, updates }: { id: string; updates: any }) => {
    const { data, error } = await supabase
      .from('surat_izin_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('surat_izin_documents').delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const createTemplate = async (templateData: {
    name: string;
    header_text?: string;
    body_text: string;
    footer_text?: string;
    is_default?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('surat_izin_templates')
      .insert({ clinic_id: clinicId, ...templateData })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const updateTemplate = async ({ id, updates }: { id: string; updates: any }) => {
    const { data, error } = await supabase
      .from('surat_izin_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('surat_izin_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const createMutation = useMutation({ mutationFn: createDocument, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-documents'] }) });
  const updateMutation = useMutation({ mutationFn: updateDocument, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-documents'] }) });
  const deleteMutation = useMutation({ mutationFn: deleteDocument, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-documents'] }) });
  const createTemplateMutation = useMutation({ mutationFn: createTemplate, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-templates'] }) });
  const updateTemplateMutation = useMutation({ mutationFn: updateTemplate, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-templates'] }) });
  const deleteTemplateMutation = useMutation({ mutationFn: deleteTemplate, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surat-izin-templates'] }) });

  return {
    documents: documentsQuery.data,
    templates: templatesQuery.data,
    isLoadingDocuments: documentsQuery.isLoading,
    isLoadingTemplates: templatesQuery.isLoading,
    createDocument: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateDocument: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteDocument: deleteMutation.mutateAsync,
    createTemplate: createTemplateMutation.mutateAsync,
    isCreatingTemplate: createTemplateMutation.isPending,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    fetchICD10Codes,
  };
};
