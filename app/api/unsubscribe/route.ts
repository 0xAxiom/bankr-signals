/**
 * Email Unsubscribe API
 * Handles unsubscribing from weekly digest and other email notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

interface UnsubscribeRequest {
  token?: string;
  email?: string;
}

function generateUnsubscribePage(message: string, success: boolean = true): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - Bankr Signals</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #e5e5e5;
      background: #0a0a0a;
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 500px;
      text-align: center;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 40px;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      color: ${success ? '#22c55e' : '#ef4444'};
      font-size: 24px;
      margin: 0 0 15px 0;
      font-weight: 600;
    }
    p {
      color: #b0b0b0;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: #22c55e;
      color: #0a0a0a;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.2s;
    }
    .button:hover {
      background: #16a34a;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #2a2a2a;
      color: #737373;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${success ? 'Unsubscribed Successfully' : 'Unsubscribe Failed'}</h1>
    <p>${message}</p>
    <a href="https://bankrsignals.com" class="button">
      Return to Bankr Signals
    </a>
    <div class="footer">
      <p>
        <strong>Bankr Signals</strong><br>
        Transaction-verified trading intelligence
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body: UnsubscribeRequest = await req.json();
    const { token, email } = body;

    if (!token && !email) {
      return NextResponse.json(
        { success: false, message: "Please provide an unsubscribe token or email address" },
        { status: 400 }
      );
    }

    let query = supabase
      .from('email_subscribers')
      .select('id, email, active');

    if (token) {
      query = query.eq('unsubscribe_token', token);
    } else if (email) {
      query = query.eq('email', email.toLowerCase());
    }

    const { data: subscriber } = await query.single();

    if (!subscriber) {
      return NextResponse.json(
        { success: false, message: "Subscription not found" },
        { status: 404 }
      );
    }

    if (!subscriber.active) {
      return NextResponse.json({
        success: true,
        message: "You're already unsubscribed from our mailing list",
      });
    }

    // Deactivate subscription
    const { error } = await supabase
      .from('email_subscribers')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to unsubscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed ${subscriber.email} from all email notifications`,
    });

  } catch (error: any) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// GET endpoint for one-click unsubscribe from email links
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    const html = generateUnsubscribePage(
      "Invalid unsubscribe link. Please use the link from your email or contact support.",
      false
    );
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  try {
    const { data: subscriber } = await supabase
      .from('email_subscribers')
      .select('id, email, active')
      .eq('unsubscribe_token', token)
      .single();

    if (!subscriber) {
      const html = generateUnsubscribePage(
        "This unsubscribe link is invalid or has expired. Please contact support if you need assistance.",
        false
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
        status: 404,
      });
    }

    if (!subscriber.active) {
      const html = generateUnsubscribePage(
        "You're already unsubscribed from our mailing list. You won't receive any more emails from us."
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Deactivate subscription
    const { error } = await supabase
      .from('email_subscribers')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    if (error) {
      console.error("Unsubscribe error:", error);
      const html = generateUnsubscribePage(
        "Failed to process your unsubscribe request. Please try again or contact support.",
        false
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
        status: 500,
      });
    }

    const html = generateUnsubscribePage(
      `We're sorry to see you go! ${subscriber.email} has been successfully unsubscribed from all email notifications. You won't receive any more emails from us.`
    );
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });

  } catch (error: any) {
    console.error("GET unsubscribe error:", error);
    const html = generateUnsubscribePage(
      "An error occurred while processing your request. Please try again or contact support.",
      false
    );
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
}