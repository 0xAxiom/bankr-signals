import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';

export async function POST(request: NextRequest) {
  try {
    const { privateKey, message } = await request.json();

    if (!privateKey || !message) {
      return NextResponse.json({ 
        error: 'Missing privateKey or message' 
      }, { status: 400 });
    }

    // Validate private key format
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      return NextResponse.json({ 
        error: 'Invalid private key format. Must be 0x followed by 64 hex characters.' 
      }, { status: 400 });
    }

    // Generate signature
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signature = await account.signMessage({ message });

    return NextResponse.json({ 
      signature,
      address: account.address 
    });

  } catch (error) {
    console.error('Signing error:', error);
    return NextResponse.json({ 
      error: 'Failed to sign message. Check private key format.' 
    }, { status: 500 });
  }
}