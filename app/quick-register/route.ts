import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const scriptPath = join(process.cwd(), 'scripts', 'quick-register.sh');
    const script = readFileSync(scriptPath, 'utf-8');
    
    return new NextResponse(script, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'inline; filename="quick-register.sh"',
      },
    });
  } catch (error) {
    return new NextResponse('Script not found', { status: 404 });
  }
}