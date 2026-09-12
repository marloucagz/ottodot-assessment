import { createBrowserClient } from "@supabase/ssr";

import {
  getSupabaseConfig,
  type SupabaseConfigOverrides,
} from "@/lib/supabase/env";

/**
 * Browser Supabase client. Pass overrides to inject URL/key at runtime.
 */
export function createClient(overrides: SupabaseConfigOverrides = {}) {
  const { url, anonKey } = getSupabaseConfig(overrides);
  return createBrowserClient(url, anonKey);
}
