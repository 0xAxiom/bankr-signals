import { NextRequest, NextResponse } from "next/server";
import { dbGetSignal, dbCloseSignal } from "@/lib/db";
import { verifySignature } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { signalId, exitPrice, exitTxHash, pnlPct, pnlUsd, message, signature } = body;

    if (!signalId || !exitPrice || !exitTxHash) {
      return NextResponse.json({ error: "signalId, exitPrice, and exitTxHash required" }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(exitTxHash)) {
      return NextResponse.json({ error: "exitTxHash must be a valid transaction hash" }, { status: 400 });
    }

    const signal = await dbGetSignal(signalId);
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    if (signal.status !== "open") {
      return NextResponse.json({ error: "Signal already closed" }, { status: 400 });
    }

    // Require signature from signal provider
    if (!message || !signature) {
      return NextResponse.json({ error: "message and signature required" }, { status: 401 });
    }

    const valid = await verifySignature(signal.provider, message, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const closed = await dbCloseSignal(signalId, parseFloat(exitPrice), pnlPct, pnlUsd, exitTxHash);
    return NextResponse.json({ success: true, signal: closed });
  } catch (error: any) {
    console.error("Close signal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
