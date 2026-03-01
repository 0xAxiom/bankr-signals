import { NextRequest, NextResponse } from "next/server";
import { dbGetProviders } from "@/lib/db";

interface Agent {
  name: string;
  twitter?: string | null;
  farcaster?: string | null; 
  address?: string | null;
  specialty: string;
  confidence: 'high' | 'medium' | 'low';
  description: string;
}

const KNOWN_AGENTS: Agent[] = [
  // Trading Bots with known Twitter handles
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
  
  // OpenClaw ecosystem agents
  {
    name: "VirtueAgent",
    twitter: "@virtue_agent", 
    address: "0x742d35Cc6634C0532925a3b8D355d3c8C6Ccc4C8",
    specialty: "AI reasoning",
    confidence: "medium",
    description: "AI reasoning agent, potentially does trading"
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
  },
  
  // Add more as discovered
  {
    name: "AlphaAgent",
    twitter: "@alpha_agent_ai",
    address: null,
    specialty: "Market analysis",
    confidence: "medium", 
    description: "AI agent focused on market analysis and predictions"
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

function generateOutreach(agent: Agent, platform: 'twitter' | 'farcaster' = 'twitter'): string | null {
  const templates = OUTREACH_TEMPLATES[platform];
  if (!templates) return null;
  
  const template = agent.confidence === 'high' && 'warm' in templates ? templates.warm : templates.cold;
  
  const confidence_hooks: Record<string, string> = {
    high: "We know you're actively trading and have a solid following.",
    medium: "Your trading activity looks promising from what we can see.",
    low: "Thought this might align with your interests."
  };
  
  return template
    .replace(/{name}/g, agent.name)
    .replace(/{specialty}/g, agent.specialty)
    .replace(/{confidence_hook}/g, confidence_hooks[agent.confidence] || '');
}

function prioritizeTargets(agents: Agent[], existingProviders: any[]): Agent[] {
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

export async function GET(request: NextRequest) {
  try {
    // Get existing providers (or use mock data if DB not available)
    let existingProviders;
    try {
      existingProviders = await dbGetProviders();
    } catch (error) {
      console.warn("Database not available, using mock data");
      existingProviders = [
        { name: "Axiom", address: "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5", twitter: "@AxiomBot", farcaster: null }
      ];
    }
    
    // Filter and prioritize targets
    const targets = prioritizeTargets(KNOWN_AGENTS, existingProviders);
    
    const result = {
      summary: {
        totalAgents: KNOWN_AGENTS.length,
        existingProviders: existingProviders.length, 
        newTargets: targets.length,
        highPriority: targets.filter(t => t.confidence === 'high').length,
        withTwitter: targets.filter(t => t.twitter).length,
        withFarcaster: targets.filter(t => t.farcaster).length
      },
      existingProviders: existingProviders.map(p => ({
        name: p.name,
        address: p.address,
        twitter: p.twitter,
        farcaster: p.farcaster
      })),
      targets: targets.map(agent => ({
        ...agent,
        outreach: {
          twitter: agent.twitter ? generateOutreach(agent, 'twitter') : null,
          farcaster: agent.farcaster ? generateOutreach(agent, 'farcaster') : null
        },
        registrationScript: agent.address 
          ? `https://bankrsignals.com/api/register-script?name=${encodeURIComponent(agent.name)}&address=${agent.address}`
          : null
      })),
      actionPlan: [
        "Review outreach messages for high-priority targets",
        "Send 2-3 personalized messages per day (don't spam)",
        "Track responses and add successful strategies", 
        "Expand KNOWN_AGENTS list with new discoveries",
        "Run this weekly to identify new targets"
      ]
    };
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error: any) {
    console.error("Onboard API error:", error);
    return NextResponse.json({ 
      error: "Failed to generate onboarding plan",
      details: error.message 
    }, { status: 500 });
  }
}