import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const message = params.get('message');
    const privateKey = params.get('privateKey');

    if (!message || !privateKey) {
      return NextResponse.json(
        { error: 'Missing message or privateKey' },
        { status: 400 }
      );
    }

    // Validate private key format
    const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(cleanKey)) {
      return NextResponse.json(
        { error: 'Invalid private key format' },
        { status: 400 }
      );
    }

    // Use dynamic import to avoid build issues
    const { privateKeyToAccount } = await import('viem/accounts');
    
    try {
      const account = privateKeyToAccount(cleanKey as `0x${string}`);
      const signature = await account.signMessage({ message });
      
      return NextResponse.json({ 
        signature,
        message,
        signer: account.address
      });
    } catch (signingError) {
      return NextResponse.json(
        { error: 'Failed to sign message. Check your private key.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Sign API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for simple message display
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const message = url.searchParams.get('message');
  
  if (message) {
    return NextResponse.json({ message });
  }

  return NextResponse.json({
    help: 'POST with message and privateKey to sign, or GET with message to display'
  });
}