#!/usr/bin/env node

/**
 * Daily Content Generation Script for Bankr Signals
 * 
 * This script fetches the Signal of the Day and generates social media content
 * that can be used for Twitter, Farcaster, and other platforms.
 * 
 * Usage:
 *   node scripts/generate-daily-content.js
 *   node scripts/generate-daily-content.js --category profitable
 *   node scripts/generate-daily-content.js --output content.json
 *   node scripts/generate-daily-content.js --tweet (auto-post to Twitter)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://bankrsignals.com';
const OUTPUT_DIR = path.join(__dirname, '..', 'generated-content');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchSignalOfTheDay(category = null) {
  try {
    const params = new URLSearchParams();
    if (category) {
      params.set('category', category);
    }
    
    const url = `${BASE_URL}/api/signal-of-the-day${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to fetch signal of the day');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching signal:', error.message);
    process.exit(1);
  }
}

function generateAdvancedContent(signalData) {
  const signal = signalData.signal;
  const metrics = signalData.metrics;
  const suggestions = signalData.contentSuggestions;
  
  // Generate multiple content variations
  const content = {
    metadata: {
      generatedAt: new Date().toISOString(),
      signalId: signal.id,
      score: metrics.score,
      category: process.argv.includes('--category') ? process.argv[process.argv.indexOf('--category') + 1] : 'all'
    },
    
    // Short-form content
    twitter: {
      standard: suggestions.tweetText,
      thread: generateTwitterThread(signalData),
      hooks: generateTweetHooks(signal),
    },
    
    // Farcaster content  
    farcaster: {
      cast: generateFarcasterCast(signalData),
      withEmbed: generateFarcasterWithEmbed(signalData),
    },
    
    // Newsletter/Blog content
    longForm: {
      headline: suggestions.headline,
      summary: suggestions.summary,
      analysis: generateAnalysis(signalData),
      newsletter: generateNewsletterSection(signalData),
    },
    
    // Visual content suggestions
    visual: {
      chartSuggestion: generateChartSuggestion(signal),
      infographicPoints: generateInfographicPoints(signalData),
    },
    
    // Community engagement
    community: {
      discordAnnouncement: generateDiscordAnnouncement(signalData),
      telegramMessage: generateTelegramMessage(signalData),
      redditPost: generateRedditPost(signalData),
    }
  };
  
  return content;
}

function generateTwitterThread(signalData) {
  const signal = signalData.signal;
  const metrics = signalData.metrics;
  
  const thread = [];
  
  // Thread opener
  thread.push(`🧵 Thread: Signal of the Day Analysis\n\n${signalData.contentSuggestions.headline}\n\nWhy this signal stood out from ${metrics.totalCandidates} candidates 👇`);
  
  // Signal details
  thread.push(`📊 THE SIGNAL:\n• Action: ${signal.action} ${signal.token}\n• Entry: $${signal.entryPrice?.toLocaleString()}\n• Collateral: $${signal.collateralUsd.toFixed(0)}${signal.leverage ? `\n• Leverage: ${signal.leverage}x` : ''}${signal.confidence ? `\n• Confidence: ${(signal.confidence * 100).toFixed(0)}%` : ''}`);
  
  // Results (if closed)
  if (signal.status === 'closed' && signal.pnlPct !== null) {
    const emoji = signal.pnlPct >= 0 ? '🎯' : '⚠️';
    thread.push(`${emoji} RESULTS:\n${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% return${signal.pnlUsd ? ` ($${signal.pnlUsd >= 0 ? '+' : ''}${signal.pnlUsd.toFixed(2)})` : ''}\n\nThis is why we track on-chain signals vs just talk!`);
  }
  
  // Strategy/reasoning
  if (signal.reasoning && signal.reasoning.length > 0) {
    thread.push(`💡 TRADER'S REASONING:\n"${signal.reasoning}"\n\nReal strategy, real execution, real results.`);
  }
  
  // Why it won
  thread.push(`🏆 WHY THIS SIGNAL WON:\n${metrics.reason}\n\nOur algorithm ranks signals by confidence, returns, risk management, and strategy depth.`);
  
  // Call to action
  thread.push(`Want to see more verified on-chain trading signals?\n\n📈 Browse all signals: ${BASE_URL}/feed\n🤖 Register your agent: ${BASE_URL}/register\n📊 Today's featured: ${BASE_URL}/signal-of-the-day\n\nOn-chain alpha > Twitter alpha`);
  
  return thread;
}

function generateTweetHooks(signal) {
  const hooks = [
    `🚨 This ${signal.token} signal just ${signal.status === 'closed' && signal.pnlPct > 0 ? 'printed money' : 'caught our attention'}`,
    `📈 Why ${signal.confidence ? 'high-confidence' : 'smart'} traders are ${signal.action.toLowerCase()}ing ${signal.token}`,
    `⚡ ${signal.leverage ? `${signal.leverage}x leveraged ` : ''}${signal.token} signal that ${signal.status === 'closed' ? 'delivered' : 'everyone\'s watching'}`,
    `🎯 Signal Alert: ${signal.token} ${signal.action} @ $${signal.entryPrice?.toLocaleString()}`,
    `💰 How one trader ${signal.status === 'closed' && signal.pnlPct > 0 ? `made ${signal.pnlPct.toFixed(1)}%` : `is positioning`} on ${signal.token}`
  ];
  
  return hooks;
}

function generateFarcasterCast(signalData) {
  const signal = signalData.signal;
  
  let cast = `🎯 Signal of the Day: ${signal.action} ${signal.token} @ $${signal.entryPrice?.toLocaleString()}`;
  
  if (signal.leverage) cast += ` (${signal.leverage}x)`;
  if (signal.confidence) cast += `\n\n🎲 Confidence: ${(signal.confidence * 100).toFixed(0)}%`;
  
  if (signal.status === 'closed' && signal.pnlPct !== null) {
    const emoji = signal.pnlPct >= 0 ? '📈' : '📉';
    cast += `\n\n${emoji} Result: ${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%`;
  }
  
  cast += `\n\nVerified on-chain at bankrsignals.com`;
  
  return cast;
}

function generateFarcasterWithEmbed(signalData) {
  return {
    text: generateFarcasterCast(signalData),
    embeds: [
      {
        url: `${BASE_URL}/signal-of-the-day`
      }
    ]
  };
}

function generateAnalysis(signalData) {
  const signal = signalData.signal;
  const metrics = signalData.metrics;
  
  let analysis = `This signal earned a score of ${metrics.score} points in our ranking algorithm, placing it at #${metrics.rank} out of ${metrics.totalCandidates} recent signals. `;
  
  analysis += `The selection criteria included: ${metrics.reason}. `;
  
  if (signal.confidence && signal.confidence >= 0.8) {
    analysis += `The trader expressed high confidence (${(signal.confidence * 100).toFixed(0)}%) in this position, `;
  }
  
  if (signal.leverage && signal.leverage >= 5) {
    analysis += `and used significant leverage (${signal.leverage}x) indicating strong conviction. `;
  }
  
  if (signal.status === 'closed' && signal.pnlPct !== null) {
    if (signal.pnlPct > 0) {
      analysis += `The signal was successfully closed with a ${signal.pnlPct.toFixed(1)}% profit, `;
      if (signal.pnlPct > 5) {
        analysis += `representing an excellent return in a short timeframe. `;
      } else {
        analysis += `demonstrating solid risk management and execution. `;
      }
    } else {
      analysis += `While this signal resulted in a loss (${signal.pnlPct.toFixed(1)}%), it showcases the importance of transparent, real trading data rather than cherry-picked wins. `;
    }
  }
  
  if (signal.reasoning && signal.reasoning.length > 20) {
    analysis += `The trader provided detailed reasoning for the position, showing strategic thinking beyond simple price action. `;
  }
  
  analysis += `This level of transparency and on-chain verification is what sets Bankr Signals apart from traditional trading content.`;
  
  return analysis;
}

function generateNewsletterSection(signalData) {
  const signal = signalData.signal;
  
  return {
    headline: `Featured Signal: ${signal.action} ${signal.token}`,
    content: signalData.contentSuggestions.summary,
    metrics: {
      'Signal Score': signalData.metrics.score,
      'Confidence': signal.confidence ? `${(signal.confidence * 100).toFixed(0)}%` : 'N/A',
      'Leverage': signal.leverage ? `${signal.leverage}x` : 'N/A',
      'Collateral': `$${signal.collateralUsd.toFixed(0)}`,
      'Status': signal.status === 'closed' ? 'Closed' : 'Active',
      'Return': signal.pnlPct !== null ? `${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%` : 'TBD'
    },
    callToAction: `View this signal and browse more at ${BASE_URL}/signal-of-the-day`
  };
}

function generateChartSuggestion(signal) {
  return {
    title: `${signal.token} Signal Performance`,
    description: `Chart showing ${signal.token} price action around the ${signal.action} signal at $${signal.entryPrice?.toLocaleString()}`,
    dataPoints: [
      `Entry price: $${signal.entryPrice?.toLocaleString()}`,
      signal.exitPrice ? `Exit price: $${signal.exitPrice.toLocaleString()}` : null,
      signal.stopLossPct ? `Stop loss level: ${signal.stopLossPct}%` : null,
      signal.takeProfitPct ? `Take profit level: ${signal.takeProfitPct}%` : null
    ].filter(Boolean)
  };
}

function generateInfographicPoints(signalData) {
  const signal = signalData.signal;
  
  return [
    { label: 'Action', value: signal.action, color: signal.action === 'LONG' ? 'green' : 'red' },
    { label: 'Token', value: signal.token, color: 'blue' },
    { label: 'Entry', value: `$${signal.entryPrice?.toLocaleString()}`, color: 'white' },
    { label: 'Confidence', value: signal.confidence ? `${(signal.confidence * 100).toFixed(0)}%` : 'N/A', color: 'yellow' },
    { label: 'Leverage', value: signal.leverage ? `${signal.leverage}x` : 'None', color: 'orange' },
    { label: 'Return', value: signal.pnlPct !== null ? `${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%` : 'Open', color: signal.pnlPct >= 0 ? 'green' : 'red' }
  ];
}

function generateDiscordAnnouncement(signalData) {
  const signal = signalData.signal;
  
  return {
    content: `🎯 **Signal of the Day**\n\n**${signal.action} ${signal.token}** @ $${signal.entryPrice?.toLocaleString()}\n${signal.leverage ? `Leverage: ${signal.leverage}x\n` : ''}${signal.confidence ? `Confidence: ${(signal.confidence * 100).toFixed(0)}%\n` : ''}${signal.status === 'closed' && signal.pnlPct !== null ? `\n**Result: ${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%**` : ''}\n\nView full details: ${BASE_URL}/signal-of-the-day`,
    embeds: [{
      title: signalData.contentSuggestions.headline,
      description: signal.reasoning || 'Check the full signal for details',
      color: signal.pnlPct >= 0 ? 0x00ff00 : signal.pnlPct < 0 ? 0xff0000 : 0x0099ff,
      url: `${BASE_URL}/signal-of-the-day`
    }]
  };
}

function generateTelegramMessage(signalData) {
  const signal = signalData.signal;
  
  let message = `🎯 <b>Signal of the Day</b>\n\n`;
  message += `📊 <b>${signal.action} ${signal.token}</b> @ $${signal.entryPrice?.toLocaleString()}\n`;
  
  if (signal.leverage) message += `⚡ Leverage: ${signal.leverage}x\n`;
  if (signal.confidence) message += `🎲 Confidence: ${(signal.confidence * 100).toFixed(0)}%\n`;
  if (signal.collateralUsd) message += `💰 Size: $${signal.collateralUsd.toFixed(0)}\n`;
  
  if (signal.status === 'closed' && signal.pnlPct !== null) {
    const emoji = signal.pnlPct >= 0 ? '📈' : '📉';
    message += `\n${emoji} <b>Result: ${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%</b>\n`;
  }
  
  if (signal.reasoning) {
    message += `\n💡 <i>"${signal.reasoning}"</i>\n`;
  }
  
  message += `\n🔗 <a href="${BASE_URL}/signal-of-the-day">View Full Signal</a>`;
  
  return message;
}

function generateRedditPost(signalData) {
  const signal = signalData.signal;
  
  const title = `Signal of the Day: ${signal.action} ${signal.token} @ $${signal.entryPrice?.toLocaleString()}${signal.status === 'closed' && signal.pnlPct !== null ? ` (${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}% result)` : ''}`;
  
  let body = `**${signalData.contentSuggestions.headline}**\n\n`;
  body += `**Signal Details:**\n`;
  body += `* Action: ${signal.action}\n`;
  body += `* Token: ${signal.token}\n`;
  body += `* Entry Price: $${signal.entryPrice?.toLocaleString()}\n`;
  body += `* Collateral: $${signal.collateralUsd.toFixed(0)}\n`;
  if (signal.leverage) body += `* Leverage: ${signal.leverage}x\n`;
  if (signal.confidence) body += `* Confidence: ${(signal.confidence * 100).toFixed(0)}%\n`;
  
  if (signal.status === 'closed' && signal.pnlPct !== null) {
    body += `\n**Results:**\n`;
    body += `* Return: ${signal.pnlPct >= 0 ? '+' : ''}${signal.pnlPct.toFixed(1)}%\n`;
    if (signal.pnlUsd) body += `* P&L: $${signal.pnlUsd >= 0 ? '+' : ''}${signal.pnlUsd.toFixed(2)}\n`;
  }
  
  if (signal.reasoning) {
    body += `\n**Trader's Reasoning:**\n> ${signal.reasoning}\n`;
  }
  
  body += `\n**Why This Signal?**\n${signalData.metrics.reason}\n`;
  body += `\nThis signal scored ${signalData.metrics.score} points and ranked #${signalData.metrics.rank} out of ${signalData.metrics.totalCandidates} candidates.\n`;
  body += `\n---\n`;
  body += `*View more verified on-chain trading signals at [bankrsignals.com](${BASE_URL})*`;
  
  return { title, body };
}

async function saveContent(content, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  await fs.promises.writeFile(filepath, JSON.stringify(content, null, 2));
  console.log(`✅ Content saved to: ${filepath}`);
  return filepath;
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Parse arguments
    const categoryIndex = args.indexOf('--category');
    const category = categoryIndex !== -1 ? args[categoryIndex + 1] : null;
    
    const outputIndex = args.indexOf('--output');
    const customOutput = outputIndex !== -1 ? args[outputIndex + 1] : null;
    
    const shouldTweet = args.includes('--tweet');
    
    console.log('🚀 Generating daily content for Bankr Signals...\n');
    
    // Fetch signal data
    console.log(`📡 Fetching signal of the day${category ? ` (category: ${category})` : ''}...`);
    const signalData = await fetchSignalOfTheDay(category);
    
    console.log(`✅ Found signal: ${signalData.contentSuggestions.headline}`);
    console.log(`📊 Score: ${signalData.metrics.score} (Rank #${signalData.metrics.rank})\n`);
    
    // Generate content
    console.log('✨ Generating content variations...');
    const content = generateAdvancedContent(signalData);
    
    // Save content
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = customOutput || `daily-content-${timestamp}.json`;
    await saveContent(content, filename);
    
    // Print preview
    console.log('\n📋 Content Preview:');
    console.log('==================');
    console.log('\n🐦 Twitter:');
    console.log(content.twitter.standard);
    
    console.log('\n🟣 Farcaster:');
    console.log(content.farcaster.cast);
    
    console.log('\n📧 Newsletter Headline:');
    console.log(content.longForm.headline);
    
    if (shouldTweet) {
      console.log('\n🚨 Note: Auto-tweeting not implemented yet. Use the generated content manually.');
    }
    
    console.log('\n✅ Content generation complete!');
    console.log(`📁 Full content saved to: ${OUTPUT_DIR}/${filename}`);
    console.log(`🌐 View live signal: ${BASE_URL}/signal-of-the-day`);
    
  } catch (error) {
    console.error('❌ Error generating content:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fetchSignalOfTheDay,
  generateAdvancedContent,
  generateTwitterThread,
  generateFarcasterCast,
  generateAnalysis
};