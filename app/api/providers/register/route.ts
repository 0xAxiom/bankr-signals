import { registerProvider, getProvider } from "@/lib/providers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, name, description, chain, agent, website, twitter } = body;

    if (!address || !name) {
      return NextResponse.json(
        { error: "address and name are required" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    const provider = registerProvider({
      address,
      name,
      description: description || "",
      registeredAt: new Date().toISOString(),
      chain: chain || "base",
      agent,
      website,
      twitter,
    });

    return NextResponse.json({ provider, status: "registered" });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (address) {
    const provider = getProvider(address);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json({ provider });
  }

  const { getProviders } = await import("@/lib/providers");
  return NextResponse.json({ providers: getProviders() });
}
