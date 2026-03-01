#!/usr/bin/env node

/**
 * Bankr Signals Agent Onboarding Script
 * 
 * Generates personalized outreach content for potential trading agents
 * Can be run independently without database access
 */

const KNOWN_AGENTS = [
  // High-confidence trading bots
  {
    name: "BankrBot",
    twitter: "@bankrbot", 
    address: null,
    specialty: "DeFi yield farming",
    confidence: "high",
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
  {
    name: "AlphaAgent",
    twitter: "@alpha_agent_ai",
    address: null,
    specialty: "Market analysis",
    confidence: "medium", 
    description: "AI agent focused on market analysis and predictions"
  },
  
  // OpenClaw ecosystem
  {
    name: "VirtueAgent",
    twitter: "@virtue_agent", 
    address: "0x742d35Cc6634C0532925a3b8D355d3c8C6Ccc4C8",
    specialty: "AI reasoning",
    confidence: "medium",
    description: "AI reasoning agent, potentially does trading"
  },
  
  // Farcaster ecosystem
  {
    name: "DegenBot",
    farcaster: "@degenbot",
    address: null,
    specialty: "Meme coin trading", 
    confidence: "medium",
    description: "Popular Farcaster trading bot"
  },
  {
    name: "BasedAgent",
    farcaster: "@basedagent",
    address: null,
    specialty: "Base ecosystem trading",
    confidence: "medium", 
    description: "Active in Base DeFi discussions"
  },
  
  // Add more targets as discovered
  {
    name: "AutoCopyBot",
    twitter: "@autocopybot",
    address: null,
    specialty: "Copy trading",
    confidence: "low",
    description: "Copy trading focused bot"
  }
];

// Existing providers (manually maintained until DB integration)
const EXISTING_PROVIDERS = [
  { name: "Axiom", address: "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5", twitter: "@AxiomBot" }
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

function generateOutreach(agent, platform = 'twitter') {
  const templates = OUTREACH_TEMPLATES[platform];
  if (!templates) return null;
  
  const template = agent.confidence === 'high' ? templates.warm || templates.cold : templates.cold;
  
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

function prioritizeTargets(agents, existingProviders) {
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

function generateOutreachPlan() {
  console.log("🚀 BANKR SIGNALS AGENT ONBOARDING PLAN");
  console.log("=".repeat(50));
  
  // Check existing providers
  console.log(`\\n📊 Current Status:`);
  console.log(`   • ${EXISTING_PROVIDERS.length} existing providers`);
  console.log(`   • ${KNOWN_AGENTS.length} known agent targets`);
  
  EXISTING_PROVIDERS.forEach(p => {
    console.log(`   ✅ ${p.name} (${p.address.slice(0,8)}...)`);
  });
  
  // Filter out already registered agents
  const targets = prioritizeTargets(KNOWN_AGENTS, EXISTING_PROVIDERS);
  
  if (targets.length === 0) {
    console.log("\\n🎉 All known agents are already registered! Consider expanding the target list.");
    return;
  }
  
  console.log(`\\n🎯 Found ${targets.length} potential targets:\\n`);
  
  // Generate outreach for each target
  targets.forEach((agent, index) => {
    console.log(`${index + 1}. ${agent.name} (${agent.confidence} confidence)`);
    console.log(`   📝 ${agent.description}`);
    console.log(`   🎯 ${agent.specialty}`);
    
    if (agent.twitter) {
      console.log(`\\n   📱 Twitter: ${agent.twitter}`);
      console.log(`   💬 DM Draft:`);
      const twitterMsg = generateOutreach(agent, 'twitter');
      console.log(`      ${twitterMsg.split('\\n').join('\\n      ')}`);
    }
    
    if (agent.farcaster) {
      console.log(`\\n   🟪 Farcaster: ${agent.farcaster}`);  
      console.log(`   💬 Cast Draft:`);
      const farcasterMsg = generateOutreach(agent, 'farcaster');
      console.log(`      ${farcasterMsg.split('\\n').join('\\n      ')}`);
    }
    
    if (agent.address) {
      console.log(`\\n   💼 Address: ${agent.address}`);
      console.log(`   🤖 Auto-script: https://bankrsignals.com/api/register-script?name=${encodeURIComponent(agent.name)}&address=${agent.address}`);
    }
    
    console.log("\\n" + "-".repeat(60) + "\\n");
  });
  
  // Generate summary for daily outreach
  const highPriority = targets.filter(t => t.confidence === 'high');
  const withTwitter = targets.filter(t => t.twitter);
  const withFarcaster = targets.filter(t => t.farcaster);
  
  console.log("📋 TODAY'S ACTION PLAN:");
  console.log(`   • ${highPriority.length} high-priority targets`);
  console.log(`   • ${withTwitter.length} can be reached via Twitter`);
  console.log(`   • ${withFarcaster.length} can be reached via Farcaster`);
  
  if (highPriority.length > 0) {
    console.log(`\\n🔥 Start with these high-priority targets:`);
    highPriority.slice(0, 3).forEach(agent => {
      console.log(`   • ${agent.name} - ${agent.description}`);
    });
  }
  
  console.log(`\\n💡 NEXT STEPS:`);
  console.log(`   1. Copy outreach messages above`);
  console.log(`   2. Send 2-3 personalized DMs/replies per day`);
  console.log(`   3. Track responses in outreach-log.json`);
  console.log(`   4. Run this script weekly to expand target list`);
  console.log(`   5. Update EXISTING_PROVIDERS when agents register`);
  
  console.log(`\\n🔗 RESOURCES:`);
  console.log(`   • Registration wizard: https://bankrsignals.com/register/wizard`);
  console.log(`   • Skill docs: https://bankrsignals.com/skill`);
  console.log(`   • Current leaderboard: https://bankrsignals.com/leaderboard`);
}

// CLI interface
if (require.main === module) {
  generateOutreachPlan();
}

module.exports = { KNOWN_AGENTS, generateOutreach, prioritizeTargets };