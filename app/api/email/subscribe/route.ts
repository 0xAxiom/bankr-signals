/**
 * Email subscription endpoint for weekly digest
 * Allows users to subscribe to weekly signal summaries
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface SubscriptionRequest {
  email: string;
  name?: string;
  source?: string;
  weekly_digest?: boolean;
  signal_alerts?: boolean;
  provider_updates?: boolean;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body: SubscriptionRequest = await req.json();
    const { email, name, source = 'website' } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Valid email address is required",
        400
      );
    }

    // Get client info
    const userAgent = req.headers.get('user-agent');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIP || req.headers.get('x-forwarded-for');

    // Check if already subscribed
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('email_subscribers')
      .select('id, active, confirmed_at, weekly_digest')
      .eq('email', email.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking existing subscriber:', checkError);
      return createErrorResponse(
        APIErrorCode.DATABASE_ERROR,
        "Failed to check subscription status",
        500
      );
    }

    if (existingSubscriber) {
      // Already exists
      if (existingSubscriber.active && existingSubscriber.confirmed_at && existingSubscriber.weekly_digest) {
        return createSuccessResponse({
          subscribed: true,
          message: "You're already subscribed to our weekly digest!",
          alreadySubscribed: true,
        });
      } else {
        // Reactivate existing subscription
        const { error: updateError } = await supabase
          .from('email_subscribers')
          .update({
            active: true,
            weekly_digest: true,
            confirmed_at: new Date().toISOString(), // Auto-confirm for now
            name: name || existingSubscriber.name,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase());

        if (updateError) {
          console.error('Error reactivating subscription:', updateError);
          return createErrorResponse(
            APIErrorCode.DATABASE_ERROR,
            "Failed to update subscription",
            500
          );
        }

        return createSuccessResponse({
          subscribed: true,
          message: "Welcome back! Your weekly digest subscription has been reactivated.",
          reactivated: true,
        });
      }
    }

    // Create new subscription
    const unsubscribeToken = generateUnsubscribeToken();
    
    const { data: newSubscriber, error: insertError } = await supabase
      .from('email_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name?.trim() || null,
        unsubscribe_token: unsubscribeToken,
        weekly_digest: body.weekly_digest !== false, // Default true
        signal_alerts: body.signal_alerts || false,
        provider_updates: body.provider_updates || false,
        source: source,
        ip_address: ipAddress,
        user_agent: userAgent,
        confirmed_at: new Date().toISOString(), // Auto-confirm for now (TODO: add email confirmation)
        created_at: new Date().toISOString(),
        active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      return createErrorResponse(
        APIErrorCode.DATABASE_ERROR,
        "Failed to create subscription",
        500
      );
    }

    // TODO: Send confirmation email
    // For now, we auto-confirm. In production, send confirmation email with token.
    
    console.log(`New email subscription: ${email} (source: ${source})`);

    return createSuccessResponse({
      subscribed: true,
      message: "Successfully subscribed to weekly digest!",
      subscriber: {
        email: newSubscriber.email,
        name: newSubscriber.name,
        subscriptions: {
          weekly_digest: newSubscriber.weekly_digest,
          signal_alerts: newSubscriber.signal_alerts,
          provider_updates: newSubscriber.provider_updates,
        },
      },
      nextDigest: "Sundays at 9 AM PT",
    });

  } catch (error: any) {
    console.error("Email subscription error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Subscription failed",
      500,
      { error: error.message }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  
  if (email) {
    // Check subscription status
    try {
      const { data: subscriber, error } = await supabase
        .from('email_subscribers')
        .select('email, name, active, weekly_digest, signal_alerts, provider_updates, created_at, confirmed_at')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !subscriber) {
        return createSuccessResponse({
          subscribed: false,
          message: "Email not found in our subscribers",
        });
      }

      return createSuccessResponse({
        subscribed: subscriber.active && subscriber.confirmed_at,
        subscriber: {
          email: subscriber.email,
          name: subscriber.name,
          subscriptions: {
            weekly_digest: subscriber.weekly_digest,
            signal_alerts: subscriber.signal_alerts,
            provider_updates: subscriber.provider_updates,
          },
          subscribedAt: subscriber.created_at,
          confirmedAt: subscriber.confirmed_at,
        },
      });
    } catch (error: any) {
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to check subscription",
        500
      );
    }
  }

  // Return info about the subscription service
  return NextResponse.json({
    message: "Email subscription service",
    endpoints: {
      subscribe: "POST /api/email/subscribe",
      checkStatus: "GET /api/email/subscribe?email=user@example.com",
      unsubscribe: "POST /api/email/unsubscribe",
    },
    features: [
      "Weekly signal digest",
      "Provider performance summaries",
      "Market insights and trends",
      "New provider highlights",
      "Win streak alerts",
    ],
    schedule: "Sundays at 9 AM PT",
  });
}