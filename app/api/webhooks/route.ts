import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// Register a webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, provider_filter, token_filter } = body;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Validate filters if provided
    if (provider_filter && !isValidAddress(provider_filter)) {
      return NextResponse.json({ error: "Invalid provider_filter address format" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        url,
        provider_filter: provider_filter || null,
        token_filter: token_filter || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating webhook:", error);
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true, webhook: data });
  } catch (error: any) {
    console.error("Webhook POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// List webhooks (optionally filter by URL for management)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterUrl = searchParams.get('url');

    let query = supabase
      .from("webhooks")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterUrl) {
      query = query.eq("url", filterUrl);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching webhooks:", error);
      return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Webhook GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove a webhook
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, url } = body;

    if (!id && !url) {
      return NextResponse.json({ error: "Either id or url is required" }, { status: 400 });
    }

    let deleteQuery = supabase.from("webhooks").delete();
    
    if (id) {
      deleteQuery = deleteQuery.eq("id", id);
    } else {
      deleteQuery = deleteQuery.eq("url", url);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("Error deleting webhook:", error);
      return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}