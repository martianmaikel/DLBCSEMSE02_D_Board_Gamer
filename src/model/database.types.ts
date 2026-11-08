export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      groups: {
        Row: {
          admin_membership_id: string | null;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          admin_membership_id?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          admin_membership_id?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_admin_same_group_fk';
            columns: ['id', 'admin_membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['group_id', 'id'];
          },
        ];
      };
      locations: {
        Row: {
          address: string;
          group_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          address: string;
          group_id: string;
          id?: string;
        };
        Update: {
          address?: string;
          group_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      memberships: {
        Row: {
          group_id: string;
          host_position: number | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          user_id: string;
          willing_to_host: boolean;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          host_position?: number | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          user_id: string;
          willing_to_host?: boolean;
        };
        Update: {
          group_id?: string;
          host_position?: number | null;
          id?: string;
          is_active?: boolean;
          joined_at?: string | null;
          user_id?: string;
          willing_to_host?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          username: string;
        };
        Update: {
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        ComputedFields: never;
        Insert: {
          actual_host_membership_id?: string | null;
          duration_minutes?: number | null;
          group_id: string;
          id?: string;
          location_id: string;
          planned_host_membership_id?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['session_status'];
        };
        Update: {
          actual_host_membership_id?: string | null;
          duration_minutes?: number | null;
          group_id?: string;
          id?: string;
          location_id?: string;
          planned_host_membership_id?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['session_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_actual_host_same_group_fk';
            columns: ['group_id', 'actual_host_membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['group_id', 'id'];
          },
          {
            foreignKeyName: 'sessions_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_location_same_group_fk';
            columns: ['group_id', 'location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['group_id', 'id'];
          },
          {
            foreignKeyName: 'sessions_planned_host_same_group_fk';
            columns: ['group_id', 'planned_host_membership_id'];
            isOneToOne: false;
            referencedRelation: 'memberships';
            referencedColumns: ['group_id', 'id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admit_group_member: {
        Args: { expected_membership?: Json; target_group_id: string; target_user_id: string };
        Returns: {
          group_id: string;
          host_position: number | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          user_id: string;
          willing_to_host: boolean;
        };
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      cancel_session: {
        Args: { expected_session: Json; position_changes?: Json; target_session_id: string };
        Returns: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_session: {
        Args: { expected_session: Json; target_session_id: string };
        Returns: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_group: {
        Args: { group_name: string };
        Returns: {
          admin_membership_id: string | null;
          id: string;
          name: string;
        };
        SetofOptions: {
          from: '*';
          to: 'groups';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_session: {
        Args: {
          new_location_address?: string;
          planned_host_id: string;
          position_changes?: Json;
          session_duration_minutes: number;
          session_location_id?: string;
          session_starts_at: string;
          target_group_id: string;
        };
        Returns: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      designate_actual_host: {
        Args: { actual_host_id: string; expected_session: Json; target_session_id: string };
        Returns: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_active_member_profiles: {
        Args: { target_group_id: string };
        Returns: {
          id: string;
          username: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      leave_group: {
        Args: {
          expected_admin_id: string;
          expected_joined_at: string;
          successor_membership_id?: string;
          target_group_id: string;
        };
        Returns: {
          group_id: string;
          host_position: number | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          user_id: string;
          willing_to_host: boolean;
        };
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_host_positions: {
        Args: { position_changes: Json; target_group_id: string };
        Returns: {
          group_id: string;
          host_position: number | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          user_id: string;
          willing_to_host: boolean;
        }[];
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_own_profile: {
        Args: { profile_username: string };
        Returns: {
          id: string;
          username: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_hosting_willingness: {
        Args: { expected_willingness: boolean; new_willingness: boolean; target_group_id: string };
        Returns: {
          group_id: string;
          host_position: number | null;
          id: string;
          is_active: boolean;
          joined_at: string | null;
          user_id: string;
          willing_to_host: boolean;
        };
        SetofOptions: {
          from: '*';
          to: 'memberships';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_session: {
        Args: {
          expected_session: Json;
          new_location_address?: string;
          planned_host_id: string;
          position_changes?: Json;
          session_duration_minutes: number;
          session_location_id?: string;
          session_starts_at: string;
          target_session_id: string;
        };
        Returns: {
          actual_host_membership_id: string | null;
          duration_minutes: number | null;
          group_id: string;
          id: string;
          location_id: string;
          planned_host_membership_id: string | null;
          starts_at: string;
          status: Database['public']['Enums']['session_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'sessions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      session_status: 'scheduled' | 'completed' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      session_status: ['scheduled', 'completed', 'cancelled'],
    },
  },
} as const;
