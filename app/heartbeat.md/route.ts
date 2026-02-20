import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const content = readFileSync(path.join(process.cwd(), "HEARTBEAT.md"), "utf-8");
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
