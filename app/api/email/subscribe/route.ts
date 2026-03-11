import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source = 'website' } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return createErrorResponse('INVALID_INPUT', 'Valid email address is required', 400);
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    // Get client info for tracking
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xForwardedFor ? xForwardedFor.split(',')[0] : request.ip;

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('email, active, confirmed_at')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.active && existing.confirmed_at) {
        return createSuccessResponse({
          message: 'You are already subscribed to our weekly digest!',
          alreadySubscribed: true
        });
      } else {
        // Reactivate inactive subscriber
        const { error } = await supabase
          .from('email_subscribers')
          .update({
            active: true,
            name: name || null,
            source,
            user_agent: userAgent,
            ip_address: ipAddress,
            confirmed_at: new Date().toISOString(), // Auto-confirm for now
            updated_at: new Date().toISOString()
          })
          .eq('email', email.toLowerCase());

        if (error) throw error;

        return createSuccessResponse({
          message: 'Welcome back! You\'re now subscribed to our weekly digest.',
          reactivated: true
        });
      }
    }

    // Create new subscriber
    const { error } = await supabase
      .from('email_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        unsubscribe_token: unsubscribeToken,
        source,
        user_agent: userAgent,
        ip_address: ipAddress,
        confirmed_at: new Date().toISOString(), // Auto-confirm for now
        weekly_digest: true,
        signal_alerts: false,
        provider_updates: false,
        active: true
      });

    if (error) throw error;

    return createSuccessResponse({
      message: 'Successfully subscribed! You\'ll receive our weekly digest every Monday.',
      subscribed: true
    });

  } catch (error: any) {
    console.error('Email subscription error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return createErrorResponse('ALREADY_EXISTS', 'This email is already subscribed', 409);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Failed to subscribe email', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token && !email) {
      return createErrorResponse('INVALID_INPUT', 'Unsubscribe token or email is required', 400);
    }

    let whereClause = {};
    if (token) {
      whereClause = { unsubscribe_token: token };
    } else if (email) {
      whereClause = { email: email.toLowerCase() };
    }

    // Update subscriber to inactive
    const { data, error } = await supabase
      .from('email_subscribers')
      .update({ 
        active: false, 
        weekly_digest: false,
        updated_at: new Date().toISOString()
      })
      .match(whereClause)
      .select('email')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return createErrorResponse('NOT_FOUND', 'Subscription not found', 404);
      }
      throw error;
    }

    return createSuccessResponse({
      message: 'Successfully unsubscribed from weekly digest',
      email: data.email,
      unsubscribed: true
    });

  } catch (error: any) {
    console.error('Email unsubscribe error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to unsubscribe', 500);
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}