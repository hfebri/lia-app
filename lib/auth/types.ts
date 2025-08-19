import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import type { UserRole } from "../../db/types";

// Extended user type that includes our database fields
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Supabase auth session with our extended user
export interface AuthSession {
  user: AuthUser;
  session: Session;
  expires: string;
}

// Auth context type
export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Sign in result
export interface SignInResult {
  error?: string;
  success: boolean;
  data?: any;
}

// Auth error
export interface AuthError {
  message: string;
  status?: number;
}

// Database user profile update
export interface UserProfileUpdate {
  name?: string;
  image?: string;
}
