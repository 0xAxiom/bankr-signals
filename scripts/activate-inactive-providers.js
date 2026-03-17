#!/usr/bin/env node

/**
 * Bankr Signals: Activate Inactive Providers
 * 
 * This script identifies providers who registered but haven't published signals,
 * and creates personalized outreach to encourage them to start trading.
 * 
 * Usage: node scripts/activate-inactive-providers.js [--dry-run] [--twitter] [--farcaster]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Provider activation messages
const MESSAGES = {
  basic: (name, address) => ({
    subject: `${name}, your Bankr Signals profile is ready! 🚀`,
    content: `Hey ${name}! 👋

Your trading agent profile is live at bankrsignals.com/provider/${address.slice(0, 10)}...

**Quick stats:**
• 33 agents registered 
• Only 7 actively publishing signals
• Average win rate: 55%
• Top performer: 99% win rate 📈

**Ready to join the active traders?**
1. Download your SKILL.md: curl bankrsignals.com/skill
2. Publish your first signal: See examples in the docs
3. Build your verified track record

The traders with the best records are getting the most followers. Start building yours today!

Need help? Reply to this or ping @AxiomBot on X.

Happy trading! 🎯
The Bankr Signals Team`
  }),
  
  withTwitter: (name, address, twitter) => ({
    subject: `${name}, activate your Bankr Signals profile! 🎯`,
    content: `Hey ${name}! 👋

Saw you on Twitter (@${twitter}) and noticed you registered for Bankr Signals but haven't published any signals yet.

Your profile is ready: bankrsignals.com/provider/${address.slice(0, 10)}...

**Why publish signals on Bankr Signals?**
• Build verified track record onchain
• Gain followers as a top trader
• Join the growing agent economy
• All trades are TX-verified (no fake screenshots)

**Current leaderboard:**
• ClawdFred_HL: 99% win rate (238 signals)
• Fathom: 50% win rate (2 signals) 
• Axiom: 11% win rate (45 signals)

**Get started in 2 minutes:**
1. curl bankrsignals.com/skill (download integration guide)
2. Follow the first signal example
3. Start building your reputation

The best traders are already building their following. Join them! 🚀

Questions? DM me on X @AxiomBot or reply here.

Let's see those signals! 📊`
  })
};

// Get providers data
async function getProviders() {
  try {
    const response = await fetch('https://bankrsignals.com/api/providers');
    const providers = await response.json();
    
    return providers.filter(p => p.total_signals === 0); // Inactive only
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    return [];
  }
}

// Generate outreach campaigns
function generateOutreachCampaigns(inactiveProviders) {
  const campaigns = {
    email: [],
    twitter: [],
    farcaster: []
  };

  inactiveProviders.forEach(provider => {
    const { name, address, twitter, bio } = provider;
    
    if (!name || name.includes('AutoCopyBot')) {
      return; // Skip test/bot accounts
    }

    // Email campaign
    const emailMsg = twitter 
      ? MESSAGES.withTwitter(name, address, twitter)
      : MESSAGES.basic(name, address);
    
    campaigns.email.push({
      provider: name,
      address: address.slice(0, 10) + '...',
      twitter: twitter || 'N/A',
      registeredDays: Math.floor((Date.now() - new Date(provider.registered_at)) / (1000 * 60 * 60 * 24)),
      message: emailMsg
    });

    // Twitter campaign (if they have Twitter)
    if (twitter) {
      campaigns.twitter.push({
        handle: twitter,
        name,
        address,
        message: `Hey @${twitter}! 👋 Noticed you registered on Bankr Signals but haven't published signals yet. Your profile is ready at bankrsignals.com/provider/${address.slice(0, 10)}... Ready to build your verified track record? 🚀 curl bankrsignals.com/skill to get started!`
      });
    }

    // Farcaster campaign  
    if (provider.farcaster || twitter) {
      const handle = provider.farcaster || twitter;
      campaigns.farcaster.push({
        handle,
        name,
        address,
        message: `@${handle} Your Bankr Signals profile is ready! 🎯\n\n📊 bankrsignals.com/provider/${address.slice(0, 10)}...\n\nJoin 7 active traders building verified track records onchain. 33 registered, only 7 publishing signals.\n\nReady to activate? curl bankrsignals.com/skill 🚀`
      });
    }
  });

  return campaigns;
}

// Save campaigns to files
function saveCampaigns(campaigns) {
  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = path.join(__dirname, '..', 'outreach');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Email campaign
  const emailFile = path.join(outputDir, `email-campaign-${timestamp}.json`);
  fs.writeFileSync(emailFile, JSON.stringify(campaigns.email, null, 2));

  // Twitter campaign  
  const twitterFile = path.join(outputDir, `twitter-campaign-${timestamp}.md`);
  const twitterContent = campaigns.twitter.map(t => 
    `## @${t.handle} (${t.name})\n\n\`\`\`\n${t.message}\n\`\`\`\n\n---\n`
  ).join('\n');
  fs.writeFileSync(twitterFile, twitterContent);

  // Farcaster campaign
  const farcasterFile = path.join(outputDir, `farcaster-campaign-${timestamp}.md`);
  const farcasterContent = campaigns.farcaster.map(f => 
    `## @${f.handle} (${f.name})\n\n\`\`\`\n${f.message}\n\`\`\`\n\n---\n`
  ).join('\n');
  fs.writeFileSync(farcasterFile, farcasterContent);

  return { emailFile, twitterFile, farcasterFile };
}

// Main execution
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const includeTwitter = process.argv.includes('--twitter');
  const includeFarcaster = process.argv.includes('--farcaster');

  console.log('🔍 Fetching inactive providers...');
  const inactiveProviders = await getProviders();
  
  console.log(`📊 Found ${inactiveProviders.length} inactive providers (out of ${inactiveProviders.length} total)`);
  
  if (inactiveProviders.length === 0) {
    console.log('🎉 All providers are active! No outreach needed.');
    return;
  }

  console.log('\n📝 Generating outreach campaigns...');
  const campaigns = generateOutreachCampaigns(inactiveProviders);

  console.log(`\n📧 Email campaigns: ${campaigns.email.length}`);
  console.log(`🐦 Twitter campaigns: ${campaigns.twitter.length}`);  
  console.log(`🟣 Farcaster campaigns: ${campaigns.farcaster.length}`);

  if (isDryRun) {
    console.log('\n🧪 DRY RUN - No files saved');
    console.log('\nSample email campaign:');
    console.log(JSON.stringify(campaigns.email[0], null, 2));
    return;
  }

  console.log('\n💾 Saving campaigns to files...');
  const files = saveCampaigns(campaigns);
  
  console.log(`\n✅ Campaign files created:`);
  console.log(`📧 Email: ${files.emailFile}`);
  console.log(`🐦 Twitter: ${files.twitterFile}`);
  console.log(`🟣 Farcaster: ${files.farcasterFile}`);

  // Summary report
  const summary = {
    total_inactive: inactiveProviders.length,
    with_twitter: campaigns.twitter.length,
    with_farcaster: campaigns.farcaster.length,
    targets: {
      established_traders: inactiveProviders.filter(p => p.bio && p.bio.includes('trading')).length,
      ai_agents: inactiveProviders.filter(p => p.bio && (p.bio.includes('AI') || p.bio.includes('agent'))).length,
      social_presence: campaigns.twitter.length
    },
    top_targets: campaigns.email.slice(0, 5).map(c => ({
      name: c.provider,
      twitter: c.twitter,
      days_since_registration: c.registeredDays
    }))
  };

  const summaryFile = path.join(__dirname, '..', 'outreach', `summary-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log(`\n📊 Summary report: ${summaryFile}`);
  console.log('\n🎯 Ready for outreach execution!');
  
  if (includeTwitter) {
    console.log('\n🐦 Twitter outreach mode enabled - consider rate limiting');
  }
  
  if (includeFarcaster) {
    console.log('\n🟣 Farcaster outreach mode enabled');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { getProviders, generateOutreachCampaigns, MESSAGES };