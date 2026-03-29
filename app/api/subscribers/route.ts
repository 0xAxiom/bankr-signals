/**
 * Subscribers API - Fetch active subscribers for email digest
 * Protected endpoint for cron jobs to get subscriber emails
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { createSuccessResponse, createErrorResponse, APIErrorCode } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface SubscriberInfo {
  email: string;
  name?: string;
  subscribedAt: string;
  source: string;
}

interface SubscribersResponse {
  count: number;
  subscribers: SubscriberInfo[];
  emails: string[]; // Just the email addresses for bulk operations
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cronSecret = searchParams.get('secret');
    const format = searchParams.get('format') || 'full'; // 'full' | 'emails'
    
    // Verify cron secret for security
    if (cronSecret !== process.env.CRON_SECRET) {
      return createErrorResponse(
        APIErrorCode.UNAUTHORIZED,
        "Invalid authentication credentials",
        401
      );
    }

    // Fetch all active, confirmed subscribers
    const { data: subscribers, error } = await supabase
      .from('email_subscribers')
      .select('email, name, created_at, source')
      .eq('active', true)
      .eq('weekly_digest', true)
      .not('confirmed_at', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error fetching subscribers:', error);
      return createErrorResponse(
        APIErrorCode.INTERNAL_ERROR,
        "Failed to fetch subscribers",
        500
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return createSuccessResponse({
        count: 0,
        subscribers: [],
        emails: []
      });
    }

    // Format response
    const subscriberList: SubscriberInfo[] = subscribers.map(sub => ({
      email: sub.email,
      name: sub.name || undefined,
      subscribedAt: sub.created_at,
      source: sub.source || 'unknown'
    }));

    const emails = subscribers.map(sub => sub.email);

    // Return just emails array for simple format
    if (format === 'emails') {
      return createSuccessResponse(emails);
    }

    // Full response with metadata
    const response: SubscribersResponse = {
      count: subscribers.length,
      subscribers: subscriberList,
      emails
    };

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error("Subscribers API error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Failed to fetch subscribers",
      500,
      { error: error.message }
    );
  }
}

// POST endpoint for managing subscribers (admin operations)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, cronSecret, email } = body;
    
    // Verify cron secret
    if (cronSecret !== process.env.CRON_SECRET) {
      return createErrorResponse(
        APIErrorCode.UNAUTHORIZED,
        "Invalid authentication credentials",
        401
      );
    }

    switch (action) {
      case 'stats':
        // Get subscriber statistics
        const { data: stats } = await supabase
          .from('email_subscribers')
          .select('active, confirmed_at, created_at, source')
          .order('created_at', { ascending: false });

        if (!stats) {
          return createSuccessResponse({
            total: 0,
            active: 0,
            confirmed: 0,
            unconfirmed: 0,
            recent24h: 0
          });
        }

        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const statistics = {
          total: stats.length,
          active: stats.filter(s => s.active && s.confirmed_at).length,
          confirmed: stats.filter(s => s.confirmed_at).length,
          unconfirmed: stats.filter(s => !s.confirmed_at).length,
          recent24h: stats.filter(s => new Date(s.created_at) > yesterday).length,
          bySource: stats.reduce((acc, s) => {
            const source = s.source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        return createSuccessResponse(statistics);

      case 'cleanup':
        // Remove inactive/unconfirmed subscribers older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { count } = await supabase
          .from('email_subscribers')
          .delete()
          .or('confirmed_at.is.null,active.eq.false')
          .lt('created_at', thirtyDaysAgo);

        return createSuccessResponse({
          message: `Cleaned up ${count || 0} inactive/unconfirmed subscribers`,
          removedCount: count || 0
        });

      default:
        return createErrorResponse(
          APIErrorCode.INVALID_INPUT,
          `Invalid action: ${action}`,
          400
        );
    }

  } catch (error: any) {
    console.error("Subscribers POST API error:", error);
    return createErrorResponse(
      APIErrorCode.INTERNAL_ERROR,
      "Failed to process request",
      500,
      { error: error.message }
    );
  }
}