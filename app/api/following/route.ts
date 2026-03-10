import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Get user's following feed - signals from followed providers
export async function GET(request: NextRequest) {
  try {
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status"); // 'open', 'closed', or null for all

    // Get providers that the user follows
    const { data: follows, error: followsError } = await supabase
      .from("provider_follows")
      .select("provider_address")
      .eq("user_identifier", userIdentifier);

    if (followsError) throw followsError;

    if (follows.length === 0) {
      return NextResponse.json({
        signals: [],
        providers: [],
        totalCount: 0,
        hasMore: false,
        message: "No followed providers. Start following traders to see their signals here!"
      });
    }

    const providerAddresses = follows.map(f => f.provider_address);

    // Build query for signals from followed providers
    let signalsQuery = supabase
      .from("signals")
      .select(`
        *,
        provider:signal_providers(name, address, avatar, verified)
      `)
      .in("provider_address", providerAddresses)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      signalsQuery = signalsQuery.eq("status", status);
    }

    const { data: signals, error: signalsError } = await signalsQuery;
    if (signalsError) throw signalsError;

    // Get provider stats for the followed providers
    const { data: providers, error: providersError } = await supabase
      .from("signal_providers")
      .select("*")
      .in("address", providerAddresses);

    if (providersError) throw providersError;

    // Get total count for pagination
    let countQuery = supabase
      .from("signals")
      .select("*", { count: "exact", head: true })
      .in("provider_address", providerAddresses);

    if (status) {
      countQuery = countQuery.eq("status", status);
    }

    const { count } = await countQuery;

    const hasMore = offset + limit < (count || 0);

    return NextResponse.json({
      signals: signals || [],
      providers: providers || [],
      totalCount: count || 0,
      hasMore,
      following: follows.length
    });

  } catch (error) {
    console.error("Get following feed error:", error);
    return NextResponse.json(
      { error: "Failed to get following feed" },
      { status: 500 }
    );
  }
}

// Get user's followed providers list
export async function POST(request: NextRequest) {
  try {
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const body = await request.json();
    const { action } = body;

    if (action === "list") {
      const { data: follows, error } = await supabase
        .from("provider_follows")
        .select(`
          created_at,
          notify_telegram,
          notify_email,
          notes,
          tags,
          provider:signal_providers(
            address,
            name,
            bio,
            avatar,
            verified,
            total_signals,
            win_rate,
            followers
          )
        `)
        .eq("user_identifier", userIdentifier)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        follows: follows || [],
        totalFollowing: follows?.length || 0
      });
    }

    if (action === "activity") {
      // Get recent activity from followed providers
      const { data: activity, error } = await supabase
        .from("following_activity")
        .select(`
          *,
          provider:signal_providers(name, avatar),
          signal:signals(direction, token_symbol, reasoning)
        `)
        .eq("user_identifier", userIdentifier)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({
        activity: activity || [],
        unreadCount: activity?.filter(a => !a.read_at).length || 0
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Following action error:", error);
    return NextResponse.json(
      { error: "Failed to process following action" },
      { status: 500 }
    );
  }
}