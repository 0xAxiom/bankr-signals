import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development or with admin access
  const isAdmin = process.env.ADMIN_ACCESS === 'true';
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isAdmin && !isDev) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 20) || process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || 'not set',
    hasPlaceholder: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder'),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    hasAdminAccess: process.env.ADMIN_ACCESS,
    hasCronSecret: !!process.env.CRON_SECRET,
  };

  return NextResponse.json(envInfo);
}