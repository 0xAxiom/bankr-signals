/**
 * Email Subscription Management API
 * Handles subscribing to weekly digest and other email notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

interface SubscribeRequest {
  email: string;
  name?: string;
  source?: string;
  referrer?: string;
}

interface SubscribeResponse {
  success: boolean;
  message: string;
  subscribed?: boolean;
  confirmationRequired?: boolean;
}

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body: SubscribeRequest = await req.json();
    const { email, name, source = 'website', referrer } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Get client IP and user agent for analytics
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    // Generate unique unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id, email, name, active, confirmed_at')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.active && existing.confirmed_at) {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed to our weekly digest!",
          subscribed: true,
        });
      } else if (existing.active && !existing.confirmed_at) {
        return NextResponse.json({
          success: true,
          message: "Please check your email to confirm your subscription.",
          confirmationRequired: true,
        });
      } else {
        // Reactivate if previously unsubscribed
        await supabase
          .from('email_subscribers')
          .update({
            active: true,
            name: name || existing.name,
            source,
            referrer,
            ip_address: ipAddress,
            user_agent: userAgent,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email.toLowerCase());

        return NextResponse.json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
          subscribed: true,
        });
      }
    }

    // Insert new subscriber
    const { error } = await supabase
      .from('email_subscribers')
      .insert({
        email: email.toLowerCase(),
        name,
        unsubscribe_token: unsubscribeToken,
        source,
        referrer,
        ip_address: ipAddress,
        user_agent: userAgent,
        weekly_digest: true,
        active: true,
        // For now, auto-confirm. In production, send confirmation email
        confirmed_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed! You'll receive our weekly digest every Sunday.",
      subscribed: true,
    });

  } catch (error: any) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Get subscription status (optional)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address" },
      { status: 400 }
    );
  }

  try {
    const { data } = await supabase
      .from('email_subscribers')
      .select('email, active, confirmed_at, created_at')
      .eq('email', email.toLowerCase())
      .single();

    if (!data) {
      return NextResponse.json({
        subscribed: false,
        message: "Email not found in our subscriber list"
      });
    }

    return NextResponse.json({
      subscribed: data.active && !!data.confirmed_at,
      confirmed: !!data.confirmed_at,
      active: data.active,
      subscribedSince: data.created_at,
    });

  } catch (error) {
    console.error("Get subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 }
    );
  }
}