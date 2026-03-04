import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getOrCreateUserPortfolio(userId: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("user_portfolios")
    .select("user_id, followed_providers")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError;
  }

  if (existing) {
    return existing;
  }

  // Create new user portfolio
  const { data: created, error: createError } = await supabase
    .from("user_portfolios")
    .insert([{
      user_id: userId,
      followed_providers: []
    }])
    .select("user_id, followed_providers")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

async function updateProviderFollowerCount(providerAddress: string) {
  // Count total followers for this provider across all user portfolios
  const { data: followers, error } = await supabase
    .rpc('count_provider_followers', { provider_address: providerAddress });

  if (error) {
    console.error("Failed to count followers:", error);
    return;
  }

  // Update the provider's follower count
  const { error: updateError } = await supabase
    .from("signal_providers")
    .update({ followers: followers || 0 })
    .eq("address", providerAddress);

  if (updateError) {
    console.error("Failed to update follower count:", updateError);
  }
}

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
    const userPortfolio = await getOrCreateUserPortfolio(userId.toLowerCase());
    const followedProviders = userPortfolio.followed_providers || [];

    if (providerAddress) {
      // Check if user follows specific provider
      const isFollowing = followedProviders.includes(providerAddress.toLowerCase());
      return NextResponse.json({ 
        userId, 
        providerAddress, 
        isFollowing,
        followedProviders 
      });
    } else {
      // Return all followed providers
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

    const userPortfolio = await getOrCreateUserPortfolio(normalizedUserId);
    const currentFollowed = userPortfolio.followed_providers || [];

    if (currentFollowed.includes(normalizedProvider)) {
      return NextResponse.json({ 
        message: "Already following this provider",
        isFollowing: true 
      });
    }

    const newFollowed = [...currentFollowed, normalizedProvider];

    const { error: updateError } = await supabase
      .from("user_portfolios")
      .update({ followed_providers: newFollowed })
      .eq("user_id", normalizedUserId);

    if (updateError) {
      throw updateError;
    }

    // Update provider follower count
    await updateProviderFollowerCount(normalizedProvider);

    return NextResponse.json({
      message: `Now following ${provider.name}`,
      isFollowing: true,
      followedProviders: newFollowed
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

    const userPortfolio = await getOrCreateUserPortfolio(normalizedUserId);
    const currentFollowed = userPortfolio.followed_providers || [];

    if (!currentFollowed.includes(normalizedProvider)) {
      return NextResponse.json({ 
        message: "Not following this provider",
        isFollowing: false 
      });
    }

    const newFollowed = currentFollowed.filter((addr: string) => addr !== normalizedProvider);

    const { error: updateError } = await supabase
      .from("user_portfolios")
      .update({ followed_providers: newFollowed })
      .eq("user_id", normalizedUserId);

    if (updateError) {
      throw updateError;
    }

    // Update provider follower count
    await updateProviderFollowerCount(normalizedProvider);

    return NextResponse.json({
      message: "Unfollowed provider",
      isFollowing: false,
      followedProviders: newFollowed
    });

  } catch (error: any) {
    console.error("Unfollow error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}