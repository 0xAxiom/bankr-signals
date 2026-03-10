import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/follows?user_id=0x...&provider=0x... - Check if user follows provider
// GET /api/follows?user_id=0x... - Get all followed providers for user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const providerAddress = searchParams.get("provider");

  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  try {
    const userIdentifier = userId.toLowerCase();

    if (providerAddress) {
      // Check if user follows specific provider
      const { data: follow, error } = await supabase
        .from("provider_follows")
        .select("provider_address, created_at")
        .eq("user_identifier", userIdentifier)
        .eq("provider_address", providerAddress.toLowerCase())
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Get all followed providers for backward compatibility
      const { data: allFollows, error: allFollowsError } = await supabase
        .from("provider_follows")
        .select("provider_address")
        .eq("user_identifier", userIdentifier);

      if (allFollowsError) throw allFollowsError;

      const followedProviders = allFollows?.map(f => f.provider_address) || [];

      return NextResponse.json({ 
        userId, 
        providerAddress: providerAddress.toLowerCase(), 
        isFollowing: !!follow,
        followedProviders 
      });
    } else {
      // Return all followed providers
      const { data: follows, error } = await supabase
        .from("provider_follows")
        .select("provider_address")
        .eq("user_identifier", userIdentifier);

      if (error) throw error;

      const followedProviders = follows?.map(f => f.provider_address) || [];

      return NextResponse.json({ 
        userId, 
        followedProviders 
      });
    }
  } catch (error: any) {
    console.error("Follow check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/follows - Follow a provider
export async function POST(req: NextRequest) {
  try {
    const { userId, providerAddress } = await req.json();

    if (!userId || !providerAddress) {
      return NextResponse.json({ 
        error: "userId and providerAddress required" 
      }, { status: 400 });
    }

    const normalizedUserId = userId.toLowerCase();
    const normalizedProvider = providerAddress.toLowerCase();

    // Verify provider exists
    const { data: provider, error: providerError } = await supabase
      .from("signal_providers")
      .select("address, name")
      .eq("address", normalizedProvider)
      .maybeSingle();

    if (providerError || !provider) {
      return NextResponse.json({ 
        error: "Provider not found" 
      }, { status: 404 });
    }

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from("provider_follows")
      .select("provider_address")
      .eq("user_identifier", normalizedUserId)
      .eq("provider_address", normalizedProvider)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existingFollow) {
      // Get all followed providers for response
      const { data: allFollows } = await supabase
        .from("provider_follows")
        .select("provider_address")
        .eq("user_identifier", normalizedUserId);

      const followedProviders = allFollows?.map(f => f.provider_address) || [];

      return NextResponse.json({ 
        message: "Already following this provider",
        isFollowing: true,
        followedProviders 
      });
    }

    // Create follow record
    const { error: followError } = await supabase
      .from("provider_follows")
      .insert({
        user_identifier: normalizedUserId,
        provider_address: normalizedProvider,
        notify_telegram: true,
        notify_email: false
      });

    if (followError) {
      throw followError;
    }

    // Get updated followed providers list
    const { data: allFollows } = await supabase
      .from("provider_follows")
      .select("provider_address")
      .eq("user_identifier", normalizedUserId);

    const followedProviders = allFollows?.map(f => f.provider_address) || [];

    return NextResponse.json({
      message: `Now following ${provider.name}`,
      isFollowing: true,
      followedProviders
    });

  } catch (error: any) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/follows - Unfollow a provider
export async function DELETE(req: NextRequest) {
  try {
    const { userId, providerAddress } = await req.json();

    if (!userId || !providerAddress) {
      return NextResponse.json({ 
        error: "userId and providerAddress required" 
      }, { status: 400 });
    }

    const normalizedUserId = userId.toLowerCase();
    const normalizedProvider = providerAddress.toLowerCase();

    // Check if user is following this provider
    const { data: existingFollow, error: checkError } = await supabase
      .from("provider_follows")
      .select("provider_address")
      .eq("user_identifier", normalizedUserId)
      .eq("provider_address", normalizedProvider)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (!existingFollow) {
      return NextResponse.json({ 
        message: "Not following this provider",
        isFollowing: false 
      });
    }

    // Delete follow record
    const { error: deleteError } = await supabase
      .from("provider_follows")
      .delete()
      .eq("user_identifier", normalizedUserId)
      .eq("provider_address", normalizedProvider);

    if (deleteError) {
      throw deleteError;
    }

    // Get updated followed providers list
    const { data: allFollows } = await supabase
      .from("provider_follows")
      .select("provider_address")
      .eq("user_identifier", normalizedUserId);

    const followedProviders = allFollows?.map(f => f.provider_address) || [];

    return NextResponse.json({
      message: "Unfollowed provider",
      isFollowing: false,
      followedProviders
    });

  } catch (error: any) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}