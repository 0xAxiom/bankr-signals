#!/usr/bin/env node

/**
 * Bankr Signals Agent Onboarding Script
 * 
 * This script identifies potential trading agents and generates personalized
 * outreach content for Twitter/Farcaster to invite them to bankrsignals.com
 */

import { dbGetProviders } from '../lib/db';

interface Agent {
  name: string;
  twitter?: string | null;
  farcaster?: string | null; 
  address?: string | null;
  specialty: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
}

interface Provider {
  address: string;
  name: string;
  twitter?: string | null;
  farcaster?: string | null;
}

const KNOWN_AGENTS: Agent[] = [
  // Trading Bots with known Twitter handles
  {
    name: "BankrBot",
    twitter: "@bankrbot", 
    address: null, // Unknown wallet
    specialty: "DeFi yield farming",
    confidence: "high", // Known to be a trading bot
    description: "The original Bankr trading bot with 741+ holders"
  },
  {
    name: "AvantisBot", 
    twitter: "@avantisbot",
    address: null,
    specialty: "Perp trading",
    confidence: "high",
    description: "Perpetual futures trading specialist"
  },
  
  // OpenClaw ecosystem agents
  {
    name: "VirtueAgent",
    twitter: "@virtue_agent", 
    address: "0x742d35Cc6634C0532925a3b8D355d3c8C6Ccc4C8",
    specialty: "AI reasoning",
    confidence: "medium",
    description: "AI reasoning agent, potentially does trading"
  },
  
  // Base ecosystem addresses (known traders from onchain data)
  {
    name: "BaseTrader001",
    twitter: null,
    address: "0x1234567890123456789012345678901234567890", // Example
    specialty: "Base ecosystem trading",
    confidence: "medium", 
    description: "Active Base trader with consistent profits"
  },
  
  // Farcaster trading bots
  {
    name: "DegenBot",
    twitter: null,
    farcaster: "@degenbot",
    address: null,
    specialty: "Meme coin trading", 
    confidence: "medium",
    description: "Popular Farcaster trading bot"
  }
];

const OUTREACH_TEMPLATES = {
  twitter: {
    cold: `Hey {name}! 👋 

Saw your trading work - impressive stuff. We built bankrsignals.com to help traders like you monetize signals & build reputation.

✅ Verified track record
✅ Subscriber revenue 
✅ 30-second setup

Your {specialty} expertise would be perfect. Interested in checking it out?`,
    
    warm: `Hey {name}! 

We're launching bankrsignals.com - a platform for verified trading signals. Given your {specialty} background, thought you'd be interested.

{confidence_hook}

Takes 30 seconds to register: bankrsignals.com/register/wizard

Would love to have you as one of our early providers!`,
  },
  
  farcaster: {
    cold: `GM {name} 🌅

Building bankrsignals.com for verified onchain trading signals. Your {specialty} work caught our attention.

Early providers get:
• Verified badges
• Revenue sharing 
• Platform promotion

30-second setup: bankrsignals.com/register/wizard

Interested?`,
  }
};

async function checkExistingProviders() {
  try {
    const providers = await dbGetProviders();
    
    console.log(`📊 Found ${providers.length} existing providers:`);
    providers.forEach(p => {
      console.log(`  - ${p.name} (${p.address})`);
    });
    
    return providers;
  } catch (error) {
    console.log("⚠️  Could not fetch existing providers, proceeding anyway:", (error as Error).message);
    return [];
  }
}

function generateOutreach(agent: Agent, platform: 'twitter' | 'farcaster' = 'twitter'): string | null {
  const templates = OUTREACH_TEMPLATES[platform];
  if (!templates) return null;
  
  const template = agent.confidence === 'high' && 'warm' in templates ? templates.warm : templates.cold;
  
  const confidence_hooks = {
    high: "We know you're actively trading and have a solid following.",
    medium: "Your trading activity looks promising from what we can see.",
    low: "Thought this might align with your interests."
  };
  
  return template
    .replace(/{name}/g, agent.name)
    .replace(/{specialty}/g, agent.specialty)
    .replace(/{confidence_hook}/g, confidence_hooks[agent.confidence] || '');
}

function prioritizeTargets(agents: Agent[], existingProviders: Provider[]): Agent[] {
  const existingAddresses = new Set(existingProviders.map(p => p.address?.toLowerCase()));
  const existingTwitters = new Set(existingProviders.map(p => p.twitter?.toLowerCase()));
  const existingFarcasters = new Set(existingProviders.map(p => p.farcaster?.toLowerCase()));
  
  return agents
    .filter(agent => {
      // Skip if already registered
      if (agent.address && existingAddresses.has(agent.address.toLowerCase())) return false;
      if (agent.twitter && existingTwitters.has(agent.twitter.toLowerCase())) return false;
      if (agent.farcaster && existingFarcasters.has(agent.farcaster.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by confidence level
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
}

async function generateOutreachPlan() {
  console.log("🚀 Bankr Signals Agent Onboarding Plan\n");
  
  // Check existing providers
  const existingProviders = await checkExistingProviders();
  
  // Filter out already registered agents
  const targets = prioritizeTargets(KNOWN_AGENTS, existingProviders);
  
  if (targets.length === 0) {
    console.log("🎉 All known agents are already registered! Consider expanding the target list.");
    return;
  }
  
  console.log(`\n🎯 Found ${targets.length} potential targets:\n`);
  
  // Generate outreach for each target
  targets.forEach((agent, index) => {
    console.log(`${index + 1}. ${agent.name} (${agent.confidence} confidence)`);
    console.log(`   Specialty: ${agent.specialty}`);
    
    if (agent.twitter) {
      console.log(`   📱 Twitter: ${agent.twitter}`);
      console.log(`   💬 Outreach:`);
      console.log(`      ${generateOutreach(agent, 'twitter')?.split('\\n').join('\\n      ')}`);
    }
    
    if (agent.farcaster) {
      console.log(`   🟪 Farcaster: ${agent.farcaster}`);  
      console.log(`   💬 Outreach:`);
      console.log(`      ${generateOutreach(agent, 'farcaster')?.split('\\n').join('\\n      ')}`);
    }
    
    if (agent.address) {
      console.log(`   💼 Address: ${agent.address}`);
      console.log(`   🤖 Auto-script: bankrsignals.com/api/register-script?name=${encodeURIComponent(agent.name)}&address=${agent.address}`);
    }
    
    console.log("");
  });
  
  // Generate summary for daily outreach
  const highPriority = targets.filter(t => t.confidence === 'high');
  const withTwitter = targets.filter(t => t.twitter);
  const withFarcaster = targets.filter(t => t.farcaster);
  
  console.log("📋 Today's Action Plan:");
  console.log(`   • ${highPriority.length} high-priority targets`);
  console.log(`   • ${withTwitter.length} can be reached via Twitter`);
  console.log(`   • ${withFarcaster.length} can be reached via Farcaster`);
  
  if (highPriority.length > 0) {
    console.log(`\\n🔥 Start with these high-priority targets:`);
    highPriority.slice(0, 3).forEach(agent => {
      console.log(`   • ${agent.name} - ${agent.description}`);
    });
  }
  
  console.log(`\\n💡 Next steps:`);
  console.log(`   1. Review outreach messages above`);
  console.log(`   2. Send 2-3 personalized DMs/replies per day`);
  console.log(`   3. Run this script weekly to expand target list`);
  console.log(`   4. Track responses in outreach-log.json`);
}

// CLI interface
if (require.main === module) {
  generateOutreachPlan().catch(console.error);
}

export { KNOWN_AGENTS, generateOutreach, prioritizeTargets };