// Database diagnostics utility for debugging production issues
export function getDatabaseDiagnostics() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING', 
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  const hasSupabaseConfig = supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('placeholder') && 
    !supabaseKey.includes('placeholder');

  const useMockData = isDevelopment && !hasSupabaseConfig;

  return {
    environment: isDevelopment ? 'development' : 'production',
    useMockData,
    hasSupabaseConfig,
    supabaseUrlPresent: !!supabaseUrl,
    supabaseKeyPresent: !!supabaseKey,
    supabaseUrlValid: supabaseUrl.includes('supabase.co'),
    envVars,
    mode: useMockData ? 'MOCK_DATA' : hasSupabaseConfig ? 'SUPABASE' : 'MISCONFIGURED'
  };
}