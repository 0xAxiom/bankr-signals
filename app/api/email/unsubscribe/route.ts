/**
 * Email unsubscribe endpoint
 * Allows users to unsubscribe from email digest
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, token, reason } = body;

    if (!email && !token) {
      return createErrorResponse(
        APIErrorCode.VALIDATION_ERROR,
        "Email address or unsubscribe token is required",
        400
      );
    }

    // Find subscriber by email or token
    let query = supabase.from('email_subscribers').select('*');
    
    if (token) {
      query = query.eq('unsubscribe_token', token);
    } else {
      query = query.eq('email', email.toLowerCase());
    }

    const { data: subscriber, error: findError } = await query.single();

    if (findError || !subscriber) {
      return createErrorResponse(
        APIErrorCode.NOT_FOUND,
        "Subscription not found",
        404
      );
    }

    // Update subscription to inactive
    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        active: false,
        weekly_digest: false,
        signal_alerts: false,
        provider_updates: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    if (updateError) {
      console.error('Error unsubscribing user:', updateError);
      return createErrorResponse(
        APIErrorCode.DATABASE_ERROR,
        "Failed to process unsubscribe request",
        500
      );
    }

    // Log unsubscribe reason if provided
    if (reason) {
      console.log(`Unsubscribe reason from ${subscriber.email}: ${reason}`);
      // TODO: Store reason in unsubscribe_log table for analytics
    }

    console.log(`Unsubscribed: ${subscriber.email} (reason: ${reason || 'not provided'})`);

    return createSuccessResponse({
      unsubscribed: true,
      message: "Successfully unsubscribed from all email notifications",
      email: subscriber.email,
    });

  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Unsubscribe failed",
      500,
      { error: error.message }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (token || email) {
    // Show unsubscribe form
    const unsubscribeHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - Bankr Signals</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 500px; 
      margin: 0 auto; 
      padding: 40px 20px; 
      background: #f9f9f9; 
    }
    .container { 
      background: white; 
      border-radius: 8px; 
      padding: 40px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
      text-align: center;
    }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; margin-bottom: 20px; }
    .form-group { margin: 20px 0; text-align: left; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    select, textarea { 
      width: 100%; 
      padding: 10px; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
      font-size: 14px;
    }
    .btn { 
      background: #dc3545; 
      color: white; 
      padding: 12px 24px; 
      border: none; 
      border-radius: 6px; 
      font-size: 16px; 
      font-weight: 500;
      cursor: pointer;
      margin: 10px;
    }
    .btn:hover { background: #c82333; }
    .btn-secondary { background: #6c757d; }
    .btn-secondary:hover { background: #545b62; }
    .message { 
      background: #d1ecf1; 
      color: #0c5460; 
      padding: 12px; 
      border-radius: 4px; 
      margin: 20px 0;
      display: none;
    }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📊 Bankr Signals</div>
    <h2>Unsubscribe from Email Updates</h2>
    <p>We're sorry to see you go! Please let us know why you're unsubscribing so we can improve.</p>
    
    <div id="message" class="message"></div>
    
    <form id="unsubscribeForm">
      <div class="form-group">
        <label for="reason">Why are you unsubscribing? (Optional)</label>
        <select id="reason" name="reason">
          <option value="">Select a reason</option>
          <option value="too_many_emails">Too many emails</option>
          <option value="not_relevant">Content not relevant</option>
          <option value="poor_performance">Signal performance was poor</option>
          <option value="found_alternative">Found a better alternative</option>
          <option value="spam">Emails feel like spam</option>
          <option value="technical_issues">Technical issues</option>
          <option value="other">Other reason</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="feedback">Additional feedback (Optional)</label>
        <textarea id="feedback" name="feedback" rows="3" placeholder="Help us improve..."></textarea>
      </div>
      
      <button type="submit" class="btn">Unsubscribe</button>
      <button type="button" class="btn btn-secondary" onclick="window.close()">Keep Subscription</button>
    </form>
    
    <p style="font-size: 12px; color: #666; margin-top: 30px;">
      You can always re-subscribe at <a href="https://bankrsignals.com">bankrsignals.com</a>
    </p>
  </div>

  <script>
    document.getElementById('unsubscribeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const messageDiv = document.getElementById('message');
      const reason = document.getElementById('reason').value;
      const feedback = document.getElementById('feedback').value;
      
      try {
        const response = await fetch('/api/email/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: '${token}',
            email: '${email}',
            reason: reason + (feedback ? ' - ' + feedback : '')
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          messageDiv.className = 'message success';
          messageDiv.textContent = 'Successfully unsubscribed. You will no longer receive emails from us.';
          messageDiv.style.display = 'block';
          document.getElementById('unsubscribeForm').style.display = 'none';
        } else {
          throw new Error(data.error || 'Failed to unsubscribe');
        }
      } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Error: ' + error.message;
        messageDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

    return new Response(unsubscribeHTML, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return NextResponse.json({
    message: "Email unsubscribe service",
    usage: "POST with email or token to unsubscribe",
    formUrl: "/api/email/unsubscribe?token=<unsubscribe_token>",
  });
}