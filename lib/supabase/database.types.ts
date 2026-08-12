export type Database = {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string;
          name: string;
          type: string;
          contact_info: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hospitals"]["Row"]> & {
          name: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["hospitals"]["Row"]>;
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          network_admin: boolean;
          role?: string | null;
          hospital_id?: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      hospital_memberships: {
        Row: {
          id: string;
          user_id: string;
          hospital_id: string;
          role: "clinician" | "hospital_staff" | "hospital_admin";
          status: "active" | "revoked";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["hospital_memberships"]["Row"]> & {
          user_id: string;
          hospital_id: string;
          role: "clinician" | "hospital_staff" | "hospital_admin";
        };
        Update: Partial<Database["public"]["Tables"]["hospital_memberships"]["Row"]>;
      };
      referral_cases: {
        Row: {
          id: string;
          reference: string;
          patient_initials: string;
          care_level: "ICU" | "HDU" | "NICU";
          urgency: "critical" | "urgent" | "routine";
          status: string;
          created_by: string | null;
          referring_facility_id: string;
          receiving_facility_id: string | null;
          clinical_summary: string | null;
          consent_obtained: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["referral_cases"]["Row"]> & {
          patient_initials: string;
          care_level: "ICU" | "HDU" | "NICU";
          referring_facility_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["referral_cases"]["Row"]>;
      };
      referral_events: {
        Row: {
          id: string;
          referral_case_id: string;
          from_status: string | null;
          to_status: string;
          actor_user_id: string | null;
          facility_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["referral_events"]["Row"]> & {
          referral_case_id: string;
          to_status: string;
        };
        Update: Partial<Database["public"]["Tables"]["referral_events"]["Row"]>;
      };
      family_confirmations: {
        Row: {
          id: string;
          referral_case_id: string;
          relationship: string;
          name: string;
          phone: string;
          consent_given: boolean;
          confirmed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["family_confirmations"]["Row"]> & {
          referral_case_id: string;
          relationship: string;
          name: string;
          phone: string;
        };
        Update: Partial<Database["public"]["Tables"]["family_confirmations"]["Row"]>;
      };
    };
  };
};
