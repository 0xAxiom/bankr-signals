import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing during build');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const { id } = params;

    const { data: signal, error } = await supabase
      .from('signals')
      .select(`
        *,
        provider_name:providers(name)
      `)
      .eq('id', id)
      .single();

    if (error || !signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Flatten the nested provider_name object
    const formattedSignal = {
      ...signal,
      provider_name: signal.provider_name?.name || 'Unknown'
    };

    return NextResponse.json(formattedSignal);
  } catch (error) {
    console.error('Error fetching signal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}