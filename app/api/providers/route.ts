import { NextRequest, NextResponse } from "next/server";
import { dbGetProviders, dbGetProviderStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const providers = await dbGetProviders();
    const enriched = await Promise.all(
      providers.map(async (p: any) => {
        const stats = await dbGetProviderStats(p.address);
        return {
          address: p.address,
          name: p.name,
          bio: p.bio,
          avatar: p.avatar,
          twitter: p.twitter,
          registered_at: p.registered_at,
          ...stats,
        };
      })
    );
    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("Providers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/providers/register to register" },
    { status: 405 }
  );
}
