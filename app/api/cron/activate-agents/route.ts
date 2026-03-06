import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Run the activation script
    const { stdout, stderr } = await execAsync(
      'node scripts/activate-agents.js --limit 3',
      { cwd: process.cwd() }
    );

    if (stderr) {
      console.warn('Activation script stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      output: stdout,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to run activation script:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run activation script',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { dryRun = false, limit = 3, minDays = 1 } = body || {};

  try {
    const flags = [
      dryRun ? '--dry-run' : '',
      `--limit ${limit}`,
      `--min-days ${minDays}`
    ].filter(Boolean).join(' ');

    const { stdout, stderr } = await execAsync(
      `node scripts/activate-agents.js ${flags}`,
      { cwd: process.cwd() }
    );

    if (stderr) {
      console.warn('Activation script stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      output: stdout,
      config: { dryRun, limit, minDays },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to run activation script:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run activation script',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}