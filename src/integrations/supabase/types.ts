export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date_time: string
          created_at: string | null
          dentist_id: string | null
          dentist_name: string
          duration_in_minutes: number
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string
          service_id: string
          service_name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_date_time: string
          created_at?: string | null
          dentist_id?: string | null
          dentist_name: string
          duration_in_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name: string
          service_id: string
          service_name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_date_time?: string
          created_at?: string | null
          dentist_id?: string | null
          dentist_name?: string
          duration_in_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string
          service_id?: string
          service_name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          details: Json | null
          created_at: string
          deleted_at: string | null
          target_entity: string | null
          target_id: string | null
          // Assuming a relationship to users table for user_id
          // users?: { full_name?: string; email?: string } | null // This is for joined data, not direct column
        }
        Insert: {
          id?: string // Typically auto-generated
          user_id: string
          action: string
          details?: Json | null
          created_at?: string // Typically auto-generated
          deleted_at?: string | null
          target_entity?: string | null
          target_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: Json | null
          created_at?: string
          deleted_at?: string | null
          target_entity?: string | null
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey" // Assuming this FK exists
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trails: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trails_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_items: {
        Row: {
          billing_date: string
          created_at: string | null
          id: string
          insurance_coverage: number | null
          medical_record_id: string | null
          patient_id: string | null
          patient_responsibility: number
          quantity: number
          service_code: string
          service_description: string
          status: string
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          billing_date?: string
          created_at?: string | null
          id?: string
          insurance_coverage?: number | null
          medical_record_id?: string | null
          patient_id?: string | null
          patient_responsibility: number
          quantity?: number
          service_code: string
          service_description: string
          status?: string
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          billing_date?: string
          created_at?: string | null
          id?: string
          insurance_coverage?: number | null
          medical_record_id?: string | null
          patient_id?: string | null
          patient_responsibility?: number
          quantity?: number
          service_code?: string
          service_description?: string
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_items_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string
          clinic_name: string
          created_at: string | null
          dashboard_access_path: string | null
          email: string
          id: string
          license_number: string | null
          npwp: string | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          address: string
          clinic_name: string
          created_at?: string | null
          dashboard_access_path?: string | null
          email: string
          id?: string
          license_number?: string | null
          npwp?: string | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          clinic_name?: string
          created_at?: string | null
          dashboard_access_path?: string | null
          email?: string
          id?: string
          license_number?: string | null
          npwp?: string | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_schedules: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          created_at: string | null
          date: string | null
          day_of_week: number | null
          doctor_id: string | null
          end_time: string
          id: string
          is_available: boolean | null
          max_appointments_per_slot: number
          notes: string | null
          slot_duration_minutes: number
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string | null
          date?: string | null
          day_of_week?: number | null
          doctor_id?: string | null
          end_time: string
          id?: string
          is_available?: boolean | null
          max_appointments_per_slot?: number
          notes?: string | null
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string | null
          date?: string | null
          day_of_week?: number | null
          doctor_id?: string | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          max_appointments_per_slot?: number
          notes?: string | null
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_name: string
          item_type: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_name: string
          item_type: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_name?: string
          item_type?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_date: string
          appointment_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string
          invoice_template: string | null
          notes: string | null
          patient_id: string
          patient_name: string
          payment_method: string | null
          payment_status: string
          sent_at: string | null
          service_charge: number
          service_name: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number: string
          invoice_template?: string | null
          notes?: string | null
          patient_id: string
          patient_name: string
          payment_method?: string | null
          payment_status?: string
          sent_at?: string | null
          service_charge?: number
          service_name: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string
          invoice_template?: string | null
          notes?: string | null
          patient_id?: string
          patient_name?: string
          payment_method?: string | null
          payment_status?: string
          sent_at?: string | null
          service_charge?: number
          service_name?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          stock_quantity: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_record_attachments: {
        Row: {
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          medical_record_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          medical_record_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          medical_record_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_attachments_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          allergies: string | null
          assessment: string | null
          blood_type: string | null
          chief_complaint: string | null
          covid19_vaccinated: boolean | null
          created_at: string | null
          diagnosis_codes: string[] | null
          doctor_id: string | null
          drug_allergies: string[] | null
          family_history: string | null
          follow_up_date: string | null
          follow_up_instructions: string | null
          history_conditions: string[] | null
          history_of_present_illness: string | null
          id: string
          is_confidential: boolean | null
          medications: string | null
          odontogram_data: Json | null
          past_medical_history: string | null
          patient_id: string | null
          physical_examination: string | null
          plan: string | null
          procedure_codes: string[] | null
          review_of_systems: string | null
          social_history: string | null
          updated_at: string | null
          visit_date: string
          vital_signs: Json | null
        }
        Insert: {
          allergies?: string | null
          assessment?: string | null
          blood_type?: string | null
          chief_complaint?: string | null
          covid19_vaccinated?: boolean | null
          created_at?: string | null
          diagnosis_codes?: string[] | null
          doctor_id?: string | null
          drug_allergies?: string[] | null
          family_history?: string | null
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          history_conditions?: string[] | null
          history_of_present_illness?: string | null
          id?: string
          is_confidential?: boolean | null
          medications?: string | null
          odontogram_data?: Json | null
          past_medical_history?: string | null
          patient_id?: string | null
          physical_examination?: string | null
          plan?: string | null
          procedure_codes?: string[] | null
          review_of_systems?: string | null
          social_history?: string | null
          updated_at?: string | null
          visit_date?: string
          vital_signs?: Json | null
        }
        Update: {
          allergies?: string | null
          assessment?: string | null
          blood_type?: string | null
          chief_complaint?: string | null
          covid19_vaccinated?: boolean | null
          created_at?: string | null
          diagnosis_codes?: string[] | null
          doctor_id?: string | null
          drug_allergies?: string[] | null
          family_history?: string | null
          follow_up_date?: string | null
          follow_up_instructions?: string | null
          history_conditions?: string[] | null
          history_of_present_illness?: string | null
          id?: string
          is_confidential?: boolean | null
          medications?: string | null
          odontogram_data?: Json | null
          past_medical_history?: string | null
          patient_id?: string | null
          physical_examination?: string | null
          plan?: string | null
          procedure_codes?: string[] | null
          review_of_systems?: string | null
          social_history?: string | null
          updated_at?: string | null
          visit_date?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications_enhanced: {
        Row: {
          brand_names: string[] | null
          contraindications: string[] | null
          controlled_substance_schedule: string | null
          created_at: string | null
          dosage_forms: string[]
          drug_class: string | null
          drug_interactions: string[] | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          name: string
          pregnancy_category: string | null
          route_of_administration: string[]
          side_effects: string[] | null
          strengths: string[]
          updated_at: string | null
          warnings: string[] | null
        }
        Insert: {
          brand_names?: string[] | null
          contraindications?: string[] | null
          controlled_substance_schedule?: string | null
          created_at?: string | null
          dosage_forms?: string[]
          drug_class?: string | null
          drug_interactions?: string[] | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pregnancy_category?: string | null
          route_of_administration?: string[]
          side_effects?: string[] | null
          strengths?: string[]
          updated_at?: string | null
          warnings?: string[] | null
        }
        Update: {
          brand_names?: string[] | null
          contraindications?: string[] | null
          controlled_substance_schedule?: string | null
          created_at?: string | null
          dosage_forms?: string[]
          drug_class?: string | null
          drug_interactions?: string[] | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pregnancy_category?: string | null
          route_of_administration?: string[]
          side_effects?: string[] | null
          strengths?: string[]
          updated_at?: string | null
          warnings?: string[] | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channels: string[]
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string
          read_at: string | null
          recipient_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          channels?: string[]
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string
          read_at?: string | null
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          channels?: string[]
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string
          read_at?: string | null
          recipient_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string
          allergies: string | null
          created_at: string | null
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string
          id: string
          medical_history_summary: string | null
          nik: string
          patient_number: string | null
          phone_number: string
          place_of_birth: string | null
          registration_date: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          allergies?: string | null
          created_at?: string | null
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender: string
          id?: string
          medical_history_summary?: string | null
          nik: string
          patient_number?: string | null
          phone_number: string
          place_of_birth?: string | null
          registration_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          allergies?: string | null
          created_at?: string | null
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string
          id?: string
          medical_history_summary?: string | null
          nik?: string
          patient_number?: string | null
          phone_number?: string
          place_of_birth?: string | null
          registration_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          billing_item_ids: string[]
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          processed_by: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          billing_item_ids: string[]
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method: string
          payment_reference?: string | null
          processed_by?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          billing_item_ids?: string[]
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          processed_by?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items_enhanced: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          days_supply: number
          directions_for_use: string
          dosage_form: string
          generic_substitution_allowed: boolean | null
          id: string
          medication_id: string | null
          medication_name: string
          prescription_id: string | null
          quantity: number
          refills_allowed: number | null
          refills_remaining: number | null
          strength: string
          total_cost: number | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          days_supply: number
          directions_for_use: string
          dosage_form: string
          generic_substitution_allowed?: boolean | null
          id?: string
          medication_id?: string | null
          medication_name: string
          prescription_id?: string | null
          quantity: number
          refills_allowed?: number | null
          refills_remaining?: number | null
          strength: string
          total_cost?: number | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          days_supply?: number
          directions_for_use?: string
          dosage_form?: string
          generic_substitution_allowed?: boolean | null
          id?: string
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string | null
          quantity?: number
          refills_allowed?: number | null
          refills_remaining?: number | null
          strength?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_enhanced_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications_enhanced"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_enhanced_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions_enhanced"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions_enhanced: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          id: string
          insurance_coverage: number | null
          medical_record_id: string | null
          patient_copay: number | null
          patient_id: string | null
          pharmacy_name: string | null
          pharmacy_phone: string | null
          prescription_date: string
          prescription_number: string
          special_instructions: string | null
          status: string
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          insurance_coverage?: number | null
          medical_record_id?: string | null
          patient_copay?: number | null
          patient_id?: string | null
          pharmacy_name?: string | null
          pharmacy_phone?: string | null
          prescription_date?: string
          prescription_number: string
          special_instructions?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          insurance_coverage?: number | null
          medical_record_id?: string | null
          patient_copay?: number | null
          patient_id?: string | null
          pharmacy_name?: string | null
          pharmacy_phone?: string | null
          prescription_date?: string
          prescription_number?: string
          special_instructions?: string | null
          status?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_enhanced_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_enhanced_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_enhanced_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_instances: {
        Row: {
          expires_at: string | null
          file_format: string
          file_name: string
          file_url: string
          generated_at: string | null
          generated_by: string | null
          id: string
          parameters_used: Json | null
          report_id: string | null
        }
        Insert: {
          expires_at?: string | null
          file_format: string
          file_name: string
          file_url: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          parameters_used?: Json | null
          report_id?: string | null
        }
        Update: {
          expires_at?: string | null
          file_format?: string
          file_name?: string
          file_url?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          parameters_used?: Json | null
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_instances_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_instances_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_scheduled: boolean | null
          is_template: boolean | null
          last_generated_at: string | null
          name: string
          next_generation_at: string | null
          report_type: string
          schedule_config: Json | null
          template_config: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_scheduled?: boolean | null
          is_template?: boolean | null
          last_generated_at?: string | null
          name: string
          next_generation_at?: string | null
          report_type: string
          schedule_config?: Json | null
          template_config: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_scheduled?: boolean | null
          is_template?: boolean | null
          last_generated_at?: string | null
          name?: string
          next_generation_at?: string | null
          report_type?: string
          schedule_config?: Json | null
          template_config?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          must_change_password: boolean | null
          phone_number: string | null
          role_id: string
          role_name: string
          updated_at: string | null
          user_auth_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          phone_number?: string | null
          role_id?: string
          role_name?: string
          updated_at?: string | null
          user_auth_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          phone_number?: string | null
          role_id?: string
          role_name?: string
          updated_at?: string | null
          user_auth_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_prescription_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
