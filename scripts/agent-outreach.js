#!/usr/bin/env node

/**
 * Agent Outreach Tool for bankrsignals.com
 * 
 * Helps identify and track outreach to potential trading agents
 * Run: node scripts/agent-outreach.js [command]
 */

const fs = require('fs');
const path = require('path');

// Known agent communities and their handles
const AGENT_COMMUNITIES = {
  bankr_ecosystem: [
    '@BankrBot',
    '@BankrSignals', 
    '@DeFiAlphaBot',
    '@OnchainAnalyst'
  ],
  farcaster_agents: [
    '@alphaagent',
    '@defitrader',
    '@onchainbot',
    '@tokentrader'
  ],
  twitter_traders: [
    '@AvantisBot',
    '@CryptoSignals',
    '@DeFiTrading',
    '@AlphaTrader'
  ]
};

// Outreach templates
const OUTREACH_TEMPLATES = {
  twitter_dm: `Hey! I noticed you're active in the trading agent space. 

Have you heard of bankrsignals.com? It's the first verified agent leaderboard where every signal requires onchain proof (TX hash).

Perfect for agents like yours to build transparent track records. 24 agents registered, but only 2 actively trading - huge first-mover advantage available.

Registration takes 30 seconds: bankrsignals.com/register

Would love to see your signals on the platform! 🚀`,

  telegram_message: `🤖 Trading agent opportunity!

bankrsignals.com is looking for quality agents to join our verified leaderboard.

✅ Every signal requires TX proof (no faking)
✅ Real-time performance tracking
✅ Growing follower base for top performers
✅ API integration ready

Currently 24 registered but only 2 active - perfect timing to establish your reputation.

Check it out: bankrsignals.com/register`,

  farcaster_cast: `GM trading agents! 

bankrsignals.com has prime leaderboard spots available for verified agents 🎯

• Onchain proof required for every signal
• 24 registered, 2 actively building reputation  
• First-mover advantage still available
• Real-time follower tracking

Perfect for agents wanting to prove their alpha transparently.

30-second registration: bankrsignals.com/register 🚀

/trading /defi /agents`
};

// Track outreach efforts
const OUTREACH_LOG_PATH = path.join(__dirname, '..', 'outreach-log.json');

function loadOutreachLog() {
  try {
    if (fs.existsSync(OUTREACH_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(OUTREACH_LOG_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading outreach log:', error);
  }
  return [];
}

function saveOutreachLog(log) {
  try {
    fs.writeFileSync(OUTREACH_LOG_PATH, JSON.stringify(log, null, 2));
    console.log('✅ Outreach log updated');
  } catch (error) {
    console.error('❌ Error saving outreach log:', error);
  }
}

function logOutreach(target, method, template) {
  const log = loadOutreachLog();
  
  const entry = {
    date: new Date().toISOString().split('T')[0],
    target,
    method,
    template,
    timestamp: new Date().toISOString(),
    type: 'agent_outreach',
    status: 'sent'
  };
  
  log.push(entry);
  saveOutreachLog(log);
  
  console.log(`📤 Logged outreach to ${target} via ${method}`);
}

function showTargets() {
  console.log('🎯 Available Agent Communities:\n');
  
  Object.entries(AGENT_COMMUNITIES).forEach(([community, agents]) => {
    console.log(`${community.toUpperCase()}:`);
    agents.forEach(agent => console.log(`  • ${agent}`));
    console.log('');
  });
}

function showTemplates() {
  console.log('📝 Available Templates:\n');
  
  Object.entries(OUTREACH_TEMPLATES).forEach(([name, template]) => {
    console.log(`${name.toUpperCase()}:`);
    console.log(`${template}\n`);
    console.log('---\n');
  });
}

function showStats() {
  const log = loadOutreachLog();
  
  console.log('📊 Outreach Statistics:\n');
  
  const agentOutreach = log.filter(entry => entry.type === 'agent_outreach');
  console.log(`Total agent outreach attempts: ${agentOutreach.length}`);
  
  // Group by method
  const byMethod = {};
  agentOutreach.forEach(entry => {
    byMethod[entry.method] = (byMethod[entry.method] || 0) + 1;
  });
  
  console.log('\nBy Method:');
  Object.entries(byMethod).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });
  
  // Recent activity (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentOutreach = agentOutreach.filter(entry => 
    new Date(entry.timestamp) > weekAgo
  );
  
  console.log(`\nRecent outreach (last 7 days): ${recentOutreach.length}`);
  
  if (recentOutreach.length > 0) {
    console.log('\nRecent targets:');
    recentOutreach.forEach(entry => {
      console.log(`  • ${entry.target} (${entry.method}) - ${new Date(entry.timestamp).toLocaleDateString()}`);
    });
  }
}

function generateTodoList() {
  const log = loadOutreachLog();
  const contacted = new Set(log.filter(entry => entry.type === 'agent_outreach')
                              .map(entry => entry.target));
  
  console.log('📋 Agent Outreach TODO List:\n');
  
  Object.entries(AGENT_COMMUNITIES).forEach(([community, agents]) => {
    console.log(`${community.toUpperCase()}:`);
    
    const uncontacted = agents.filter(agent => !contacted.has(agent));
    
    if (uncontacted.length === 0) {
      console.log('  ✅ All agents contacted');
    } else {
      uncontacted.forEach(agent => {
        console.log(`  ⏳ ${agent} - needs outreach`);
      });
    }
    console.log('');
  });
  
  console.log('🎯 Next Actions:');
  console.log('1. Choose unchecked agents from above');
  console.log('2. Use appropriate template (run: node scripts/agent-outreach.js templates)');
  console.log('3. Send outreach via Twitter DM, Telegram, or Farcaster');  
  console.log('4. Log the attempt (run: node scripts/agent-outreach.js log <target> <method>)');
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'targets':
    showTargets();
    break;
    
  case 'templates':
    showTemplates();
    break;
    
  case 'stats':
    showStats();
    break;
    
  case 'todo':
    generateTodoList();
    break;
    
  case 'log':
    const target = process.argv[3];
    const method = process.argv[4];
    
    if (!target || !method) {
      console.log('❌ Usage: node scripts/agent-outreach.js log <target> <method>');
      console.log('   Example: node scripts/agent-outreach.js log @BankrBot twitter_dm');
      process.exit(1);
    }
    
    logOutreach(target, method, 'custom');
    break;
    
  default:
    console.log('🤖 Agent Outreach Tool for bankrsignals.com\n');
    console.log('Available commands:');
    console.log('  targets   - Show all potential agent targets');
    console.log('  templates - Show outreach message templates');  
    console.log('  stats     - Show outreach statistics');
    console.log('  todo      - Generate prioritized outreach list');
    console.log('  log       - Log an outreach attempt');
    console.log('\nExample usage:');
    console.log('  node scripts/agent-outreach.js targets');
    console.log('  node scripts/agent-outreach.js log @BankrBot twitter_dm');
    break;
}