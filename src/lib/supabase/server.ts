import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceKey &&
    !supabaseUrl.includes("your-project-url") &&
    !supabaseServiceKey.includes("your-key")
);

export const getSupabaseServerClient = () => {
  if (!isSupabaseServerConfigured) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
