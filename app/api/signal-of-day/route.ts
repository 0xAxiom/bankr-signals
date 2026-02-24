import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Signal {
  id: string;
  provider: string;
  timestamp: string;
  action: 'LONG' | 'SHORT';
  token: string;
  entryPrice: number;
  leverage: number;
  pnlPct?: number;
  status: 'open' | 'closed';
  reasoning?: string;
  confidence?: number;
}

interface Provider {
  address: string;
  name: string;
  avatar?: string;
}

function loadSignals(): Signal[] {
  const signalsPath = path.join(process.cwd(), 'data', 'signals.json');
  if (!fs.existsSync(signalsPath)) return [];
  return JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
}

function loadProviders(): Provider[] {
  const providersPath = path.join(process.cwd(), 'data', 'providers.json');
  if (!fs.existsSync(providersPath)) return [];
  return JSON.parse(fs.readFileSync(providersPath, 'utf8'));
}

function selectSignalOfDay(signals: Signal[]): Signal | null {
  if (signals.length === 0) return null;
  
  // Scoring algorithm for "Signal of the Day"
  const scoredSignals = signals.map(signal => {
    let score = 0;
    
    // Recent signals get higher scores
    const hoursAgo = (Date.now() - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 24) score += 10;
    else if (hoursAgo < 72) score += 5;
    
    // Profitable closed signals get bonus
    if (signal.status === 'closed' && signal.pnlPct && signal.pnlPct > 0) {
      score += signal.pnlPct * 0.5; // 0.5 points per % profit
    }
    
    // Open positions with reasoning get bonus
    if (signal.status === 'open' && signal.reasoning) {
      score += 3;
    }
    
    // Higher leverage gets slight bonus (more interesting)
    if (signal.leverage >= 10) score += 2;
    else if (signal.leverage >= 5) score += 1;
    
    // Confidence bonus if available
    if (signal.confidence && signal.confidence >= 0.8) score += 2;
    
    // Randomize slightly so we don't always show the same signal
    score += Math.random() * 2;
    
    return { ...signal, score };
  });
  
  // Sort by score and pick the top one
  scoredSignals.sort((a, b) => b.score - a.score);
  return scoredSignals[0];
}

export async function GET() {
  try {
    const signals = loadSignals();
    const providers = loadProviders();
    
    const selectedSignal = selectSignalOfDay(signals);
    if (!selectedSignal) {
      return NextResponse.json({ 
        signal: null, 
        provider: null 
      });
    }
    
    const provider = providers.find(p => p.address === selectedSignal.provider);
    if (!provider) {
      return NextResponse.json({ 
        signal: null, 
        provider: null 
      });
    }
    
    return NextResponse.json({
      signal: selectedSignal,
      provider: provider
    });
    
  } catch (error) {
    console.error('Signal of day error:', error);
    return NextResponse.json(
      { error: 'Failed to load signal of day' },
      { status: 500 }
    );
  }
}