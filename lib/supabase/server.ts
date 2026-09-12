import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabaseConfig,
  type SupabaseConfigOverrides,
} from "@/lib/supabase/env";

/**
 * Server Supabase client. Pass overrides to inject URL/key at runtime (prod).
 */
export async function createClient(overrides: SupabaseConfigOverrides = {}) {
  const { url, anonKey } = getSupabaseConfig(overrides);
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
        }
      },
    },
  });
}
