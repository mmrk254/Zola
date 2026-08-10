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
          role: string;
          hospital_id: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          name: string;
          role: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      referral_cases: {
        Row: {
          id: string;
          reference: string;
          patient_initials: string;
          care_level: "ICU" | "HDU" | "NICU";
          urgency: "critical" | "urgent" | "routine";
          status: string;
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
