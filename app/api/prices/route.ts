import { NextRequest, NextResponse } from "next/server";
import { getMultipleTokenPrices } from "@/lib/prices";
import { getPriceByAddress } from "@/lib/onchain-price";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  const addresses = req.nextUrl.searchParams.get("addresses");

  if (!symbols && !addresses) {
    return NextResponse.json({ error: "Missing symbols or addresses param" }, { status: 400 });
  }

  const results: Record<string, any> = {};

  // Fetch by symbol (existing behavior)
  if (symbols) {
    const tokenList = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (tokenList.length > 0) {
      const prices = await getMultipleTokenPrices(tokenList);
      Object.assign(results, prices);
    }
  }

  // Fetch by contract address (new — for onchain tokens)
  if (addresses) {
    const addrList = addresses.split(",").map(a => a.trim().toLowerCase()).filter(Boolean);
    await Promise.allSettled(
      addrList.map(async (addr) => {
        const price = await getPriceByAddress(addr);
        if (price !== null) {
          results[addr] = { price, change24h: 0, timestamp: Date.now(), source: "dexscreener-address" };
        }
      })
    );
  }

  return NextResponse.json({ prices: results, timestamp: Date.now() });
}
