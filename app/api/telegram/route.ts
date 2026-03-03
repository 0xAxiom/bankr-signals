import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const dynamic = "force-dynamic";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Database schema for telegram_subscribers table:
// CREATE TABLE telegram_subscribers (
//   id SERIAL PRIMARY KEY,
//   chat_id BIGINT UNIQUE NOT NULL,
//   username TEXT,
//   provider_filter TEXT[], -- Array of provider addresses to follow
//   token_filter TEXT[], -- Array of tokens to watch  
//   min_confidence DECIMAL(3,2), -- Minimum confidence threshold
//   created_at TIMESTAMP DEFAULT NOW(),
//   active BOOLEAN DEFAULT true
// );

async function sendTelegramMessage(chatId: string, text: string, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }

  return response.json();
}

function formatSignalForTelegram(signal: any): string {
  const { provider, action, token, entryPrice, leverage, confidence, reasoning, collateralUsd } = signal;
  
  const providerName = getProviderName(provider) || `${provider.slice(0, 6)}...${provider.slice(-4)}`;
  const actionEmoji = action === 'LONG' || action === 'BUY' ? '🟢' : '🔴';
  const leverageText = leverage ? ` ${leverage}x` : '';
  const confidenceText = confidence ? ` (${Math.round(confidence * 100)}% confidence)` : '';
  
  return `${actionEmoji} <b>${action} ${token}${leverageText}</b>\n\n` +
    `👤 Provider: <b>${providerName}</b>\n` +
    `💰 Entry: $${entryPrice.toLocaleString()}\n` +
    `💵 Size: $${collateralUsd.toLocaleString()}${confidenceText}\n\n` +
    `💭 <i>${reasoning || 'No reasoning provided'}</i>\n\n` +
    `📊 <a href="https://bankrsignals.com/provider/${provider}">View Provider</a>`;
}

function getProviderName(address: string): string | null {
  // Known provider addresses to names mapping
  const KNOWN_PROVIDERS: Record<string, string> = {
    '0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5': 'Axiom',
    // Add more as they register
  };
  
  return KNOWN_PROVIDERS[address.toLowerCase()] || null;
}

// Webhook endpoint to receive signal notifications from /api/signals
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Handle webhook from signals API
    if (body.type === 'new_signal' && body.signal) {
      await handleNewSignal(body.signal);
      return NextResponse.json({ success: true });
    }
    
    // Handle Telegram bot updates (commands from users)
    if (body.message || body.callback_query) {
      await handleTelegramUpdate(body);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Unknown request type' }, { status: 400 });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleNewSignal(signal: any) {
  try {
    // Get all active subscribers
    const { data: subscribers, error } = await supabase
      .from('telegram_subscribers')
      .select('*')
      .eq('active', true);
    
    if (error || !subscribers?.length) {
      console.log('No telegram subscribers found');
      return;
    }
    
    // Filter subscribers based on their preferences
    const matchingSubscribers = subscribers.filter(sub => {
      // Provider filter
      if (sub.provider_filter?.length > 0 && 
          !sub.provider_filter.includes(signal.provider.toLowerCase())) {
        return false;
      }
      
      // Token filter
      if (sub.token_filter?.length > 0 && 
          !sub.token_filter.includes(signal.token.toUpperCase())) {
        return false;
      }
      
      // Confidence filter
      if (sub.min_confidence && signal.confidence && 
          signal.confidence < sub.min_confidence) {
        return false;
      }
      
      return true;
    });
    
    if (matchingSubscribers.length === 0) {
      console.log('No subscribers match signal filters');
      return;
    }
    
    const telegramMessage = formatSignalForTelegram(signal);
    
    // Send notifications (fire and forget)
    const promises = matchingSubscribers.map(async (subscriber) => {
      try {
        await sendTelegramMessage(subscriber.chat_id, telegramMessage);
        console.log(`Sent signal notification to ${subscriber.chat_id}`);
      } catch (error: any) {
        console.error(`Failed to send to ${subscriber.chat_id}:`, error);
        
        // If bot was blocked, deactivate subscriber
        if (error.message.includes('bot was blocked')) {
          await supabase
            .from('telegram_subscribers')
            .update({ active: false })
            .eq('chat_id', subscriber.chat_id);
        }
      }
    });
    
    await Promise.allSettled(promises);
  } catch (error: any) {
    console.error('Handle new signal error:', error);
  }
}

async function handleTelegramUpdate(update: any) {
  const message = update.message;
  if (!message?.text) return;
  
  const chatId = message.chat.id.toString();
  const text = message.text.trim();
  const username = message.from?.username;
  
  try {
    if (text.startsWith('/start')) {
      await handleStartCommand(chatId, username);
    } else if (text.startsWith('/subscribe')) {
      await handleSubscribeCommand(chatId, text, username);
    } else if (text.startsWith('/unsubscribe')) {
      await handleUnsubscribeCommand(chatId);
    } else if (text.startsWith('/status')) {
      await handleStatusCommand(chatId);
    } else if (text.startsWith('/help')) {
      await handleHelpCommand(chatId);
    } else {
      await sendTelegramMessage(chatId, 
        "Unknown command. Send /help for available commands.");
    }
  } catch (error: any) {
    console.error('Handle telegram update error:', error);
    await sendTelegramMessage(chatId, 
      "Sorry, there was an error processing your request.");
  }
}

async function handleStartCommand(chatId: string, username?: string) {
  const welcomeMessage = `🚀 <b>Welcome to Bankr Signals!</b>

Get instant notifications when verified traders publish new signals.

<b>Commands:</b>
/subscribe - Subscribe to all signals
/subscribe [provider] - Follow specific provider
/subscribe [token] - Watch specific tokens (ETH, BTC, etc.)
/unsubscribe - Stop all notifications
/status - Check your subscription
/help - Show this help

<a href="https://bankrsignals.com">Visit bankrsignals.com</a> to see all providers and their track records.`;

  await sendTelegramMessage(chatId, welcomeMessage);
}

async function handleSubscribeCommand(chatId: string, text: string, username?: string) {
  const parts = text.split(' ').slice(1); // Remove /subscribe
  
  // Parse filters from command
  let providerFilter: string[] = [];
  let tokenFilter: string[] = [];
  let minConfidence: number | null = null;
  
  parts.forEach(part => {
    if (part.startsWith('0x') && part.length === 42) {
      // Ethereum address - provider filter
      providerFilter.push(part.toLowerCase());
    } else if (part.match(/^[A-Z]{2,5}$/)) {
      // Token symbol
      tokenFilter.push(part.toUpperCase());
    } else if (part.endsWith('%')) {
      // Confidence percentage
      const conf = parseInt(part.replace('%', '')) / 100;
      if (conf >= 0 && conf <= 1) {
        minConfidence = conf;
      }
    }
  });
  
  // Upsert subscriber
  const { error } = await supabase
    .from('telegram_subscribers')
    .upsert({
      chat_id: chatId,
      username,
      provider_filter: providerFilter.length > 0 ? providerFilter : null,
      token_filter: tokenFilter.length > 0 ? tokenFilter : null,
      min_confidence: minConfidence,
      active: true,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'chat_id'
    });
  
  if (error) {
    await sendTelegramMessage(chatId, "Error subscribing. Please try again.");
    return;
  }
  
  let confirmMessage = "✅ <b>Subscribed to Bankr Signals!</b>\n\n";
  
  if (providerFilter.length > 0) {
    confirmMessage += `👤 Following providers: ${providerFilter.map(p => `${p.slice(0,6)}...`).join(', ')}\n`;
  }
  
  if (tokenFilter.length > 0) {
    confirmMessage += `📈 Watching tokens: ${tokenFilter.join(', ')}\n`;
  }
  
  if (minConfidence) {
    confirmMessage += `🎯 Min confidence: ${Math.round(minConfidence * 100)}%\n`;
  }
  
  if (providerFilter.length === 0 && tokenFilter.length === 0) {
    confirmMessage += "📡 You'll receive ALL signals from ALL providers.\n";
  }
  
  confirmMessage += "\nUse /unsubscribe to stop notifications anytime.";
  
  await sendTelegramMessage(chatId, confirmMessage);
}

async function handleUnsubscribeCommand(chatId: string) {
  const { error } = await supabase
    .from('telegram_subscribers')
    .update({ active: false })
    .eq('chat_id', chatId);
  
  if (error) {
    await sendTelegramMessage(chatId, "Error unsubscribing. Please try again.");
    return;
  }
  
  await sendTelegramMessage(chatId, 
    "❌ <b>Unsubscribed successfully</b>\n\nYou won't receive signal notifications anymore.\n\nSend /subscribe to re-enable notifications.");
}

async function handleStatusCommand(chatId: string) {
  const { data: subscriber, error } = await supabase
    .from('telegram_subscribers')
    .select('*')
    .eq('chat_id', chatId)
    .single();
  
  if (error || !subscriber || !subscriber.active) {
    await sendTelegramMessage(chatId, 
      "❌ <b>Not subscribed</b>\n\nSend /subscribe to start receiving notifications.");
    return;
  }
  
  let statusMessage = "✅ <b>Subscription Active</b>\n\n";
  
  if (subscriber.provider_filter?.length > 0) {
    statusMessage += `👤 Following providers: ${subscriber.provider_filter.map((p: string) => `${p.slice(0,6)}...`).join(', ')}\n`;
  } else {
    statusMessage += "👤 Following: ALL providers\n";
  }
  
  if (subscriber.token_filter?.length > 0) {
    statusMessage += `📈 Watching tokens: ${subscriber.token_filter.join(', ')}\n`;
  } else {
    statusMessage += "📈 Watching: ALL tokens\n";
  }
  
  if (subscriber.min_confidence) {
    statusMessage += `🎯 Min confidence: ${Math.round(subscriber.min_confidence * 100)}%\n`;
  }
  
  statusMessage += `\n📅 Subscribed: ${new Date(subscriber.created_at).toLocaleDateString()}\n`;
  statusMessage += "\nSend /unsubscribe to stop notifications.";
  
  await sendTelegramMessage(chatId, statusMessage);
}

async function handleHelpCommand(chatId: string) {
  const helpMessage = `🤖 <b>Bankr Signals Bot Help</b>

<b>Basic Commands:</b>
/start - Welcome message
/subscribe - Get all signals
/unsubscribe - Stop notifications  
/status - Check subscription
/help - This help message

<b>Advanced Subscription Examples:</b>
• <code>/subscribe ETH BTC</code> - Watch only ETH and BTC signals
• <code>/subscribe 0x523E...</code> - Follow specific provider
• <code>/subscribe 80%</code> - Only signals with 80%+ confidence
• <code>/subscribe ETH 0x523E... 90%</code> - ETH signals from provider with 90%+ confidence

<b>Links:</b>
🌐 <a href="https://bankrsignals.com">Website</a>
📊 <a href="https://bankrsignals.com/leaderboard">Leaderboard</a>
📝 <a href="https://bankrsignals.com/register/wizard">Register as Provider</a>`;

  await sendTelegramMessage(chatId, helpMessage);
}

// Telegram bot setup (register webhook)
export async function GET(req: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 500 });
    }
    
    const { searchParams } = new URL(req.url);
    const setup = searchParams.get('setup');
    
    if (setup === 'webhook') {
      // Set webhook URL for Telegram bot
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram`;
      const response = await fetch(`${TELEGRAM_API_BASE}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      
      const result = await response.json();
      return NextResponse.json({ success: true, webhook_set: result });
    }
    
    if (setup === 'signals_webhook') {
      // Register this endpoint as a webhook for signal notifications
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram`;
      
      // Register with /api/webhooks
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: webhookUrl,
          // No filters - receive all signals
        }),
      });
      
      const result = await response.json();
      return NextResponse.json({ success: true, signals_webhook: result });
    }
    
    return NextResponse.json({ 
      message: 'Telegram bot endpoint',
      setup_webhook: `?setup=webhook`,
      setup_signals: `?setup=signals_webhook`
    });
  } catch (error: any) {
    console.error('Telegram GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}