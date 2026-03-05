import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the HEARTBEAT.md file from the project root
    const heartbeatPath = path.join(process.cwd(), 'HEARTBEAT.md');
    const content = fs.readFileSync(heartbeatPath, 'utf8');

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error reading HEARTBEAT.md:', error);
    return NextResponse.json(
      { error: 'Failed to load heartbeat file' },
      { status: 500 }
    );
  }
}