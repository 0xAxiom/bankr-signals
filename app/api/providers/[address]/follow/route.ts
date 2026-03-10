import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

// Get follow status for a provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const { data, error } = await supabase
      .from("provider_follows")
      .select("created_at, notify_telegram, notify_email, notes, tags")
      .eq("provider_address", address)
      .eq("user_identifier", userIdentifier)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      throw error;
    }

    return NextResponse.json({
      success: true,
      following: !!data,
      followDetails: data || null
    });

  } catch (error) {
    console.error("Get follow status error:", error);
    return NextResponse.json(
      { error: "Failed to get follow status" },
      { status: 500 }
    );
  }
}

// Follow a provider
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const body = await request.json();
    const { 
      notify_telegram = true, 
      notify_email = false,
      notes = "",
      tags = []
    } = body;

    // Check if provider exists
    const { data: provider, error: providerError } = await supabase
      .from("signal_providers")
      .select("address, name")
      .eq("address", address)
      .single();

    if (providerError) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Create or update follow
    const { data, error } = await supabase
      .from("provider_follows")
      .upsert({
        user_identifier: userIdentifier,
        provider_address: address,
        notify_telegram,
        notify_email,
        notes,
        tags
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Now following ${provider.name}`,
      followDetails: data
    });

  } catch (error) {
    console.error("Follow provider error:", error);
    return NextResponse.json(
      { error: "Failed to follow provider" },
      { status: 500 }
    );
  }
}

// Unfollow a provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const { error } = await supabase
      .from("provider_follows")
      .delete()
      .eq("provider_address", address)
      .eq("user_identifier", userIdentifier);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Unfollowed successfully"
    });

  } catch (error) {
    console.error("Unfollow provider error:", error);
    return NextResponse.json(
      { error: "Failed to unfollow provider" },
      { status: 500 }
    );
  }
}

// Update follow preferences
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const userIdentifier = request.headers.get("x-user-identifier") || 
                          request.cookies.get("user_session")?.value ||
                          "anonymous";

    const body = await request.json();
    const updates = {
      ...body,
      provider_address: address,
      user_identifier: userIdentifier
    };

    const { data, error } = await supabase
      .from("provider_follows")
      .update(updates)
      .eq("provider_address", address)
      .eq("user_identifier", userIdentifier)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Follow preferences updated",
      followDetails: data
    });

  } catch (error) {
    console.error("Update follow preferences error:", error);
    return NextResponse.json(
      { error: "Failed to update follow preferences" },
      { status: 500 }
    );
  }
}