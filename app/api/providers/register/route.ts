import { NextRequest, NextResponse } from "next/server";
import { dbRegisterProvider, dbGetProvider } from "@/lib/db";
import { verifySignature } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAlphanumericHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(handle);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, name, description, bio, avatar, chain, agent, website, twitter, farcaster, github, message, signature } = body;

    if (!address || !name) {
      return NextResponse.json({ error: "address and name are required" }, { status: 400 });
    }

    if (!isValidAddress(address)) {
      return NextResponse.json({ error: "Invalid Ethereum address format" }, { status: 400 });
    }

    if (!message || !signature) {
      return NextResponse.json(
        { error: "message and signature are required. Message format: bankr-signals:register:{address}:{timestamp}" },
        { status: 401 }
      );
    }

    // Validate message format
    const msgMatch = message.match(/^bankr-signals:register:(0x[a-fA-F0-9]{40}):(\d+)$/);
    if (!msgMatch) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    if (msgMatch[1].toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: "Address in message does not match" }, { status: 400 });
    }

    // Check timestamp freshness (5 min window)
    const msgTimestamp = parseInt(msgMatch[2]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - msgTimestamp) > 300) {
      return NextResponse.json({ error: "Message timestamp expired (5 min window)" }, { status: 400 });
    }

    // Verify signature
    const valid = await verifySignature(address, message, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Validate optional fields
    if (website && !isValidUrl(website)) {
      return NextResponse.json({ error: "Invalid website URL" }, { status: 400 });
    }
    if (twitter && !isAlphanumericHandle(twitter)) {
      return NextResponse.json({ error: "Invalid twitter handle" }, { status: 400 });
    }
    if (farcaster && !isAlphanumericHandle(farcaster)) {
      return NextResponse.json({ error: "Invalid farcaster handle" }, { status: 400 });
    }
    if (github && !isAlphanumericHandle(github)) {
      return NextResponse.json({ error: "Invalid github handle" }, { status: 400 });
    }

    const provider = await dbRegisterProvider({
      address, name, bio, description, avatar,
      chain: chain || "base", agent, website, twitter, farcaster, github,
    });

    return NextResponse.json({ success: true, provider });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
