import { getProvider, getProviders } from "@/lib/providers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Issue #9: Input validation helpers
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

function isAlphanumericHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(handle);
}

// Issue #1: Wallet signature verification
import { verifySignature } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, name, description, bio, avatar, chain, agent, website, twitter, farcaster, github, message, signature } = body;

    if (!address || !name) {
      return NextResponse.json(
        { error: "address and name are required" },
        { status: 400 }
      );
    }

    // Issue #9: Validate address format
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // Issue #1: Require signature verification
    if (!message || !signature) {
      return NextResponse.json(
        { error: "message and signature are required for authentication. Message format: bankr-signals:register:{address}:{timestamp}" },
        { status: 401 }
      );
    }

    // Validate message format
    const msgMatch = message.match(/^bankr-signals:register:(0x[a-fA-F0-9]{40}):(\d+)$/);
    if (!msgMatch) {
      return NextResponse.json(
        { error: "Invalid message format. Expected: bankr-signals:register:{address}:{timestamp}" },
        { status: 400 }
      );
    }

    // Check address in message matches
    if (msgMatch[1].toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: "Address in message does not match provided address" },
        { status: 400 }
      );
    }

    // Check timestamp is recent (within 5 minutes)
    const msgTimestamp = parseInt(msgMatch[2]);
    if (Math.abs(Date.now() - msgTimestamp) > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Message timestamp expired. Must be within 5 minutes." },
        { status: 400 }
      );
    }

    // Verify signature
    const valid = await verifySignature(address, message, signature);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    if (bio && bio.length > 280) {
      return NextResponse.json(
        { error: "Bio must be 280 characters or less" },
        { status: 400 }
      );
    }

    // Issue #9: Validate URLs
    if (avatar && !isValidUrl(avatar)) {
      return NextResponse.json({ error: "Invalid avatar URL (must be http/https)" }, { status: 400 });
    }
    if (website && !isValidUrl(website)) {
      return NextResponse.json({ error: "Invalid website URL (must be http/https)" }, { status: 400 });
    }

    // Issue #9: Validate handles
    if (twitter && !isAlphanumericHandle(twitter)) {
      return NextResponse.json({ error: "Invalid twitter handle" }, { status: 400 });
    }
    if (farcaster && !isAlphanumericHandle(farcaster)) {
      return NextResponse.json({ error: "Invalid farcaster handle" }, { status: 400 });
    }
    if (github && !isAlphanumericHandle(github)) {
      return NextResponse.json({ error: "Invalid github handle" }, { status: 400 });
    }

    // Validate name
    if (typeof name !== "string" || name.length > 100 || name.length < 1) {
      return NextResponse.json({ error: "Name must be 1-100 characters" }, { status: 400 });
    }

    // Issue #3: Writes are read-only in production
    try {
      const { registerProvider } = await import("@/lib/providers");
      const provider = registerProvider({
        address,
        name,
        description: description || "",
        bio,
        avatar,
        registeredAt: new Date().toISOString(),
        chain: chain || "base",
        agent,
        website,
        twitter,
        farcaster,
        github,
      });
      return NextResponse.json({ provider, status: "registered" });
    } catch (err: any) {
      if (err?.code === "READ_ONLY") {
        return NextResponse.json(
          { error: "Read-only in production. Submit a PR to data/providers.json to register." },
          { status: 503 }
        );
      }
      throw err;
    }
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
    if (!isValidAddress(address)) {
      return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
    }
    const provider = getProvider(address);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json({ provider });
  }

  return NextResponse.json({ providers: getProviders() });
}
