import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TelehealthSession = {
  id: string;
  appointment_id: string | null;
  room_name: string;
  room_url: string | null;
  host_name: string | null;
  patient_name: string | null;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  started_at: string | null;
  ended_at: string | null;
  duration_secs: number | null;
  notes: string | null;
  recording_url: string | null;
  created_at: string;
};

export type CreateTelehealthSessionParams = {
  appointment_id: string;
  host_name: string;
  patient_name: string;
};

export type UpdateTelehealthSessionParams = {
  id: string;
  status?: TelehealthSession['status'];
  notes?: string;
  duration_secs?: number;
  started_at?: string;
};

export const useTelehealth = () => {
  const queryClient = useQueryClient();

  const fetchTelehealthSessions = async (): Promise<TelehealthSession[]> => {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  };

  const fetchTelehealthSessionById = async (id: string): Promise<TelehealthSession | null> => {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  };

  const fetchTelehealthSessionByAppointment = async (appointmentId: string): Promise<TelehealthSession | null> => {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  };

  const createTelehealthSession = async (params: CreateTelehealthSessionParams): Promise<TelehealthSession> => {
    const { appointment_id, host_name, patient_name } = params;

    // Generate a unique room name using UUID
    const roomName = `telehealth-${appointment_id.slice(0, 8)}-${Date.now()}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    const { data, error } = await supabase
      .from('telehealth_sessions')
      .insert({
        appointment_id,
        room_name: roomName,
        room_url: roomUrl,
        host_name,
        patient_name,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  const updateTelehealthSession = async (params: UpdateTelehealthSessionParams): Promise<TelehealthSession> => {
    const { id, ...updates } = params;

    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  const startTelehealthSession = async (id: string): Promise<TelehealthSession> => {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  const endTelehealthSession = async (id: string, notes?: string): Promise<TelehealthSession> => {
    const endedAt = new Date().toISOString();

    // First get the session to calculate duration
    const { data: session, error: fetchError } = await supabase
      .from('telehealth_sessions')
      .select('started_at')
      .eq('id', id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    let durationSecs = null;
    if (session?.started_at) {
      durationSecs = Math.floor((new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000);
    }

    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update({
        status: 'completed',
        ended_at: endedAt,
        duration_secs: durationSecs,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  const cancelTelehealthSession = async (id: string): Promise<TelehealthSession> => {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  };

  // Query for fetching all sessions
  const sessionsQuery = useQuery({
    queryKey: ['telehealth_sessions'],
    queryFn: fetchTelehealthSessions,
    staleTime: 1000 * 60 * 5,
  });

  // Query for fetching session by ID
  const sessionByIdQuery = (id: string) => useQuery({
    queryKey: ['telehealth_session', id],
    queryFn: () => fetchTelehealthSessionById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  // Query for fetching session by appointment ID
  const sessionByAppointmentQuery = (appointmentId: string) => useQuery({
    queryKey: ['telehealth_session_by_appointment', appointmentId],
    queryFn: () => fetchTelehealthSessionByAppointment(appointmentId),
    enabled: !!appointmentId,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation for creating a session
  const createSessionMutation = useMutation({
    mutationFn: createTelehealthSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telehealth_sessions'] });
    },
  });

  // Mutation for updating a session
  const updateSessionMutation = useMutation({
    mutationFn: updateTelehealthSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['telehealth_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['telehealth_session', variables.id] });
    },
  });

  // Mutation for starting a session
  const startSessionMutation = useMutation({
    mutationFn: startTelehealthSession,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['telehealth_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['telehealth_session', id] });
    },
  });

  // Mutation for ending a session
  const endSessionMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => endTelehealthSession(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['telehealth_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['telehealth_session', variables.id] });
    },
  });

  // Mutation for cancelling a session
  const cancelSessionMutation = useMutation({
    mutationFn: cancelTelehealthSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telehealth_sessions'] });
    },
  });

  return {
    // Queries
    sessions: sessionsQuery.data,
    isLoadingSessions: sessionsQuery.isLoading,

    sessionById: sessionByIdQuery,
    sessionByAppointment: sessionByAppointmentQuery,

    // Mutations
    createSession: createSessionMutation.mutateAsync,
    isCreatingSession: createSessionMutation.isPending,
    createSessionError: createSessionMutation.error,

    updateSession: updateSessionMutation.mutateAsync,
    isUpdatingSession: updateSessionMutation.isPending,

    startSession: startSessionMutation.mutateAsync,
    isStartingSession: startSessionMutation.isPending,

    endSession: endSessionMutation.mutateAsync,
    isEndingSession: endSessionMutation.isPending,

    cancelSession: cancelSessionMutation.mutateAsync,
    isCancellingSession: cancelSessionMutation.isPending,
  };
};