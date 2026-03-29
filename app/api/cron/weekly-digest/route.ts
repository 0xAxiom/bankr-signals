import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    
    // Verify cron secret
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting weekly digest cron job...');

    // Get all active email subscribers who want weekly digest
    const { data: subscribers, error: subscribersError } = await supabase
      .from('email_subscribers')
      .select('email, name')
      .eq('active', true)
      .eq('weekly_digest', true)
      .not('confirmed_at', 'is', null);

    if (subscribersError) {
      console.error('Error fetching subscribers:', subscribersError);
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers found for weekly digest');
      return NextResponse.json({ 
        success: true,
        message: 'No active subscribers found',
        subscribers: 0
      });
    }

    const emails = subscribers.map(sub => sub.email);
    
    console.log(`Found ${emails.length} active subscribers for weekly digest`);

    // Send the digest
    const digestResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email-digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails: emails,
        cronSecret: cronSecret
      })
    });

    const digestResult = await digestResponse.json();

    if (!digestResult.success) {
      console.error('Failed to send weekly digest:', digestResult);
      return NextResponse.json({ 
        error: 'Failed to send digest',
        details: digestResult 
      }, { status: 500 });
    }

    console.log(`Weekly digest sent successfully:`, digestResult);

    return NextResponse.json({
      success: true,
      message: `Weekly digest sent to ${emails.length} subscribers`,
      subscribers: emails.length,
      results: digestResult.results,
      digest: digestResult.digest
    });

  } catch (error) {
    console.error('Weekly digest cron error:', error);
    return NextResponse.json({ 
      error: 'Weekly digest cron failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow manual trigger via POST as well
  return GET(request);
}