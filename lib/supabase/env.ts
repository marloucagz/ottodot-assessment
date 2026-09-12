export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfigOverrides = Partial<SupabaseConfig>;

/**
 * Resolve Supabase connection config from environment, with optional
 * runtime injection for production and tests.
 */
export function getSupabaseConfig(
  overrides: SupabaseConfigOverrides = {},
): SupabaseConfig {
  const url =
    overrides.url ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const anonKey =
    overrides.anonKey ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL and anon/publishable key are required. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or pass overrides to getSupabaseConfig().",
    );
  }

  return { url, anonKey };
}
