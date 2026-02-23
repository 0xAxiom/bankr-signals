import { NextRequest, NextResponse } from "next/server";
import { getMultipleTokenPrices } from "@/lib/prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "Missing symbols param" }, { status: 400 });
  }

  const tokenList = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (tokenList.length === 0) {
    return NextResponse.json({ error: "No valid symbols" }, { status: 400 });
  }

  const prices = await getMultipleTokenPrices(tokenList);
  return NextResponse.json({ prices, timestamp: Date.now() });
}
