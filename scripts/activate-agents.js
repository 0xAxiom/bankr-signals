/**
 * Agent Activation Script
 * 
 * Identifies inactive trading agents and helps activate them with personalized outreach.
 * Can be run manually or scheduled as a cron job.
 * 
 * Usage:
 *   node scripts/activate-agents.js [--dry-run] [--limit N] [--min-days N]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  minDaysSinceRegistration: 1, // Minimum days before considering for activation
  maxOutreachAttempts: 2, // Max times to reach out to same agent
  batchSize: 5, // Max agents to process in one run
  activationTrackingFile: path.join(__dirname, '../data/activation-tracking.json')
};

// Load existing activation tracking
function loadActivationTracking() {
  try {
    if (fs.existsSync(CONFIG.activationTrackingFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.activationTrackingFile, 'utf8'));
    }
  } catch (error) {
    console.warn('Failed to load activation tracking:', error.message);
  }
  return {};
}

// Save activation tracking
function saveActivationTracking(tracking) {
  try {
    const dir = path.dirname(CONFIG.activationTrackingFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.activationTrackingFile, JSON.stringify(tracking, null, 2));
  } catch (error) {
    console.error('Failed to save activation tracking:', error.message);
  }
}

// Fetch inactive agents from API
async function fetchInactiveAgents() {
  try {
    // Use localhost for development, production URL for prod
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://bankrsignals.com'
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/inactive-agents`);
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch inactive agents:', error.message);
    return null;
  }
}

// Generate activation command for an agent
function generateActivationCommand(provider) {
  return `# ${provider.name} - Quick Signal Publication
# Copy/paste this command to publish your first signal:

curl -X POST "https://bankrsignals.com/api/signals" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "BUY",
    "token": "ETH", 
    "entry_price": 2150.00,
    "confidence": 0.80,
    "reasoning": "Momentum breakout above resistance. Strong volume confirmation.",
    "tx_hash": "0xYOUR_TRANSACTION_HASH_HERE"
  }'

# Next steps:
# 1. Make your trade on Base (Avantis, Uniswap, etc.)
# 2. Copy the transaction hash
# 3. Replace 0xYOUR_TRANSACTION_HASH_HERE with your real hash
# 4. Run this command
# 5. Check https://bankrsignals.com/feed to see your signal live!`;
}

// Generate Twitter outreach message
function generateTwitterMessage(provider, attemptNumber = 1) {
  const messages = [
    // First outreach attempt
    `Hey @${provider.twitter}! 👋 Saw you registered on bankrsignals.com ${provider.days_since_registration} days ago. Ready to publish your first signal?

Here's a 30-second guide: https://bankrsignals.com/quick-start

Your first signal gets featured on the main feed! 📊🚀 #TradingAgents`,

    // Second outreach attempt (more helpful)
    `@${provider.twitter} Quick follow-up: Need help publishing your first signal on bankrsignals.com?

I can send you a ready-to-use command that just needs your tx hash. Just reply and I'll help you get live in under 2 minutes! 

Your track record starts with signal #1 📈`
  ];

  return messages[Math.min(attemptNumber - 1, messages.length - 1)];
}

// Check if agent is ready for activation outreach
function isReadyForOutreach(provider, tracking) {
  const agentTracking = tracking[provider.address] || {};
  
  // Check minimum days since registration
  if (provider.days_since_registration < CONFIG.minDaysSinceRegistration) {
    return false;
  }
  
  // Check if we've already reached max outreach attempts
  if ((agentTracking.outreach_attempts || 0) >= CONFIG.maxOutreachAttempts) {
    return false;
  }
  
  // Check if we've contacted them recently (wait at least 3 days between attempts)
  const lastOutreach = agentTracking.last_outreach_date;
  if (lastOutreach) {
    const daysSinceLastOutreach = Math.floor(
      (Date.now() - new Date(lastOutreach).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastOutreach < 3) {
      return false;
    }
  }
  
  return true;
}

// Priority scoring for activation candidates
function calculateActivationPriority(provider) {
  let score = 0;
  
  // Has Twitter handle (can be reached)
  if (provider.twitter) score += 100;
  
  // Has bio (shows engagement)
  if (provider.bio && provider.bio.length > 20) score += 50;
  
  // Newer registration gets higher priority
  if (provider.days_since_registration <= 3) score += 30;
  else if (provider.days_since_registration <= 7) score += 20;
  else if (provider.days_since_registration <= 14) score += 10;
  
  // Bio mentions trading/signals
  if (provider.bio && /trading|signal|defi|crypto/i.test(provider.bio)) {
    score += 25;
  }
  
  return score;
}

// Main activation function
async function activateAgents(options = {}) {
  const {
    dryRun = false,
    limit = CONFIG.batchSize,
    minDays = CONFIG.minDaysSinceRegistration
  } = options;
  
  console.log('🚀 Starting agent activation process...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${limit} agents`);
  console.log(`Min days: ${minDays} days\n`);
  
  // Load current tracking data
  const tracking = loadActivationTracking();
  
  // Fetch inactive agents
  const data = await fetchInactiveAgents();
  if (!data) {
    console.error('❌ Failed to fetch inactive agents');
    return;
  }
  
  console.log(`📊 Found ${data.total_inactive} inactive agents`);
  console.log(`📊 ${data.activation_candidates} need activation\n`);
  
  // Filter and prioritize activation candidates
  const candidates = data.providers
    .filter(provider => provider.days_since_registration >= minDays)
    .filter(provider => isReadyForOutreach(provider, tracking))
    .map(provider => ({
      ...provider,
      priority_score: calculateActivationPriority(provider)
    }))
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
  
  if (candidates.length === 0) {
    console.log('✅ No agents ready for activation outreach at this time');
    return;
  }
  
  console.log(`🎯 Processing ${candidates.length} activation candidates:\n`);
  
  // Process each candidate
  const results = [];
  for (const provider of candidates) {
    const agentTracking = tracking[provider.address] || {};
    const attemptNumber = (agentTracking.outreach_attempts || 0) + 1;
    
    console.log(`📋 ${provider.name} (@${provider.twitter || 'no-twitter'})`);
    console.log(`   Registered: ${provider.days_since_registration}d ago`);
    console.log(`   Priority: ${provider.priority_score}`);
    console.log(`   Attempt: #${attemptNumber}`);
    
    if (provider.twitter) {
      const message = generateTwitterMessage(provider, attemptNumber);
      console.log(`   Twitter message prepared (${message.length} chars)`);
      
      if (!dryRun) {
        // Update tracking
        tracking[provider.address] = {
          ...agentTracking,
          outreach_attempts: attemptNumber,
          last_outreach_date: new Date().toISOString(),
          last_outreach_type: 'twitter',
          last_outreach_message: message
        };
      }
      
      results.push({
        provider: provider.name,
        address: provider.address,
        twitter: provider.twitter,
        message: message,
        action: 'twitter_outreach'
      });
    } else {
      console.log(`   ⚠️  No Twitter handle - consider manual outreach`);
      results.push({
        provider: provider.name,
        address: provider.address,
        action: 'manual_outreach_needed'
      });
    }
    
    // Generate activation command file
    const activationCommand = generateActivationCommand(provider);
    const filename = `activation-${provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    
    if (!dryRun) {
      const commandsDir = path.join(__dirname, '../data/activation-commands');
      if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(commandsDir, filename), activationCommand);
    }
    
    console.log(`   📝 Command file: ${filename}`);
    console.log('');
  }
  
  // Save updated tracking
  if (!dryRun) {
    saveActivationTracking(tracking);
    console.log(`💾 Updated activation tracking for ${candidates.length} agents`);
  }
  
  // Summary
  console.log('\n📈 Activation Summary:');
  console.log(`   Candidates processed: ${candidates.length}`);
  console.log(`   Twitter outreach: ${results.filter(r => r.action === 'twitter_outreach').length}`);
  console.log(`   Manual outreach needed: ${results.filter(r => r.action === 'manual_outreach_needed').length}`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - No actual outreach performed');
    console.log('Run without --dry-run to execute outreach');
  }
  
  return results;
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : CONFIG.batchSize,
    minDays: args.includes('--min-days') ? parseInt(args[args.indexOf('--min-days') + 1]) : CONFIG.minDaysSinceRegistration
  };
  
  activateAgents(options).catch(console.error);
}

export { activateAgents, generateActivationCommand, generateTwitterMessage };