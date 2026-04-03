import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClinicIdentityStep } from "@/components/onboarding/ClinicIdentityStep";
import { LocationStep } from "@/components/onboarding/LocationStep";
import { HeadOfClinicStep } from "@/components/onboarding/HeadOfClinicStep";
import { OperationalHoursStep } from "@/components/onboarding/OperationalHoursStep";
import { ContactStep } from "@/components/onboarding/ContactStep";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Identitas Klinik" },
  { id: 2, label: "Lokasi & Alamat" },
  { id: 3, label: "Kepala Klinik" },
  { id: 4, label: "Jadwal Operasional" },
  { id: 5, label: "Informasi Kontak" },
  { id: 6, label: "Review & Launch" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    loadClinic();
  }, []);

  const loadClinic = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    // Find clinic for this user
    const { data: clinicUser } = await supabase
      .from('clinic_users')
      .select('clinic_id, role')
      .eq('user_id', user.id)
      .eq('role', 'clinic_admin')
      .single();

    if (!clinicUser) {
      navigate("/dashboard");
      return;
    }

    const { data: clinicData } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', clinicUser.clinic_id)
      .single();

    if (!clinicData) {
      navigate("/dashboard");
      return;
    }

    if (clinicData.status === 'active') {
      navigate("/dashboard");
      return;
    }

    // Load onboarding progress
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('current_step, step_data, completed_steps')
      .eq('clinic_id', clinicUser.clinic_id)
      .single();

    setClinicId(clinicUser.clinic_id);
    setClinic(clinicData);

    if (progress) {
      setCurrentStep(progress.current_step || 1);
      setStepData(progress.step_data || {});
      setCompletedSteps(progress.completed_steps || []);
    }

    setIsLoading(false);
  };

  const saveProgress = async (nextStep: number, data: Record<string, any>) => {
    if (!clinicId) return;
    setIsSaving(true);

    const newStepData = { ...stepData, [`step_${currentStep}`]: data };
    const newCompleted = completedSteps.includes(currentStep)
      ? completedSteps
      : [...completedSteps, currentStep];

    await supabase
      .from('onboarding_progress')
      .upsert({
        clinic_id: clinicId,
        current_step: nextStep,
        step_data: newStepData,
        completed_steps: newCompleted,
        last_saved_at: new Date().toISOString(),
      }, {
        onConflict: 'clinic_id',
      });

    setStepData(newStepData);
    setCompletedSteps(newCompleted);
    setCurrentStep(nextStep);
    setIsSaving(false);

    toast({
      title: "Progress Tersimpan",
      description: "Anda bisa melanjutkan nanti.",
    });
  };

  const handleStepSubmit = async (data: Record<string, any>) => {
    await saveProgress(currentStep + 1, data);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalize = async () => {
    if (!clinicId) return;
    setIsFinalizing(true);

    try {
      // Merge all step data
      const allData = Object.values(stepData).reduce((acc, step) => ({ ...acc, ...step }), {});

      // Update clinic with all data
      const { error: clinicError } = await supabase
        .from('clinics')
        .update({
          status: 'active',
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...allData,
        })
        .eq('id', clinicId);

      if (clinicError) throw clinicError;

      // Create default operating hours for all 7 days if not already set
      const { data: existingHours } = await supabase
        .from('clinic_operating_hours')
        .select('day_of_week')
        .eq('clinic_id', clinicId);

      if (!existingHours || existingHours.length === 0) {
        const defaultHours = [1, 2, 3, 4, 5].map(day => ({
          clinic_id: clinicId,
          day_of_week: day,
          is_open: true,
          open_time: '08:00',
          close_time: '17:00',
          slot_duration_mins: 30,
        }));
        defaultHours.push({
          clinic_id: clinicId,
          day_of_week: 6,
          is_open: true,
          open_time: '08:00',
          close_time: '13:00',
          slot_duration_mins: 30,
        });
        defaultHours.push({
          clinic_id: clinicId,
          day_of_week: 0,
          is_open: false,
          open_time: null,
          close_time: null,
          slot_duration_mins: 30,
        });
        await supabase.from('clinic_operating_hours').insert(defaultHours);
      }

      toast({
        title: "Klinik Siap! 🎉",
        description: "Selamat datang di DentiCare Pro!",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Gagal Menyimpan",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 medical-gradient rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-black text-2xl">DC</span>
          </div>
          <p className="text-on-surface-variant">Memuat...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    const currentData = stepData[`step_${currentStep}`] || {};

    switch (currentStep) {
      case 1:
        return <ClinicIdentityStep initialData={currentData} onSubmit={handleStepSubmit} isSaving={isSaving} />;
      case 2:
        return <LocationStep initialData={currentData} onSubmit={handleStepSubmit} isSaving={isSaving} clinicId={clinicId} />;
      case 3:
        return <HeadOfClinicStep initialData={currentData} onSubmit={handleStepSubmit} isSaving={isSaving} />;
      case 4:
        return <OperationalHoursStep initialData={currentData} onSubmit={handleStepSubmit} isSaving={isSaving} clinicId={clinicId} />;
      case 5:
        return <ContactStep initialData={currentData} onSubmit={handleStepSubmit} isSaving={isSaving} />;
      case 6:
        return (
          <ReviewStep
            stepData={stepData}
            clinic={clinic}
            onBack={handleBack}
            onFinalize={handleFinalize}
            isFinalizing={isFinalizing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant/20">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 medical-gradient rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg">DC</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary font-headline">Setup Klinik</h1>
                <p className="text-xs text-on-surface-variant">Lengkapkan data untuk memulai</p>
              </div>
            </div>
            <div className="text-sm text-on-surface-variant">
              Step {currentStep} dari {STEPS.length}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      completedSteps.includes(step.id)
                        ? 'bg-primary text-white'
                        : currentStep === step.id
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 text-center hidden sm:block ${
                    currentStep === step.id ? 'text-primary font-semibold' : 'text-on-surface-variant'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${
                    completedSteps.includes(step.id + 1) || completedSteps.includes(step.id)
                      ? 'bg-primary'
                      : 'bg-surface-container-high'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="bg-surface-container-lowest shadow-sm border-0">
            <div className="p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-on-surface font-headline">
                  {STEPS[currentStep - 1]?.label}
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  {currentStep === 1 && "Masukkan informasi dasar tentang klinik Anda"}
                  {currentStep === 2 && "Tandai lokasi klinik di peta dan lengkapi alamat"}
                  {currentStep === 3 && "Data dokter kepala sesuai STR dan SIP"}
                  {currentStep === 4 && "Atur jam operasional dan durasi konsultasi"}
                  {currentStep === 5 && "Informasi kontak untuk pasien dan sistem reminder"}
                  {currentStep === 6 && "Periksa kembali semua data sebelum launch"}
                </p>
              </div>
              {renderStep()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
