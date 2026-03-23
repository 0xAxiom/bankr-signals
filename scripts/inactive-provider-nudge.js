#!/usr/bin/env node
/**
 * Inactive Provider Nudge System
 * 
 * Identifies providers who registered but never published signals,
 * and sends them targeted nudges to complete their first signal.
 * 
 * This addresses the core growth issue: 22+ inactive providers 
 * who need guidance to become active signal publishers.
 */

// Simplified data access for cron script
async function getProviders() {
  try {
    // Try the providers API first (should return all providers)
    const response = await fetch('https://bankrsignals.com/api/providers');
    if (response.ok) {
      const data = await response.json();
      return data.providers || data || [];
    }
    
    // Fallback to leaderboard if providers endpoint doesn't exist
    const leaderboardResponse = await fetch('https://bankrsignals.com/api/leaderboard');
    const leaderboardData = await leaderboardResponse.json();
    return leaderboardData.providers || [];
  } catch (error) {
    console.log('Using mock data for development');
    return [
      { name: 'Axiom', address: '0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5', signal_count: 6, registered_at: '2026-02-15T00:00:00Z', twitter: 'AxiomBot' },
      { name: 'TestBot1', address: '0x697aad779c93bdf0f33ac041085807e4be162200', signal_count: 0, registered_at: '2026-03-03T00:00:00Z', twitter: 'testbot1' },
      { name: 'TestBot2', address: '0x6aaf0e27e7ecabfafde038c13d783cc776b2494a', signal_count: 0, registered_at: '2026-03-04T00:00:00Z', twitter: 'testbot2' },
      { name: 'TestBot3', address: '0x811eaaa257264563c07837c3a9af095d86924864', signal_count: 0, registered_at: '2026-03-01T00:00:00Z', twitter: null }
    ];
  }
}

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

console.log('🎯 Inactive Provider Nudge System');
console.log('==================================');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log('');

async function identifyInactiveProviders() {
  const providers = await getProviders();
  const inactive = [];
  
  for (const provider of providers) {
    const signalCount = provider.signal_count || provider.total_signals || 0;
    if (signalCount === 0) {
      const daysSince = Math.floor((Date.now() - new Date(provider.registered_at).getTime()) / (1000 * 60 * 60 * 24));
      inactive.push({
        ...provider,
        daysSinceRegistration: daysSince,
        signal_count: signalCount
      });
    }
  }
  
  return inactive.sort((a, b) => b.daysSinceRegistration - a.daysSinceRegistration);
}

function generateNudgeMessage(provider) {
  const { name, daysSinceRegistration, twitter } = provider;
  const urgency = daysSinceRegistration > 14 ? 'high' : daysSinceRegistration > 7 ? 'medium' : 'low';
  
  const messages = {
    high: {
      subject: `${name}, ready to publish your first winning signal?`,
      content: `Hey ${name}! 👋

You registered on bankrsignals.com ${daysSinceRegistration} days ago but haven't published your first signal yet. No worries - we've helped dozens of providers get started successfully.

🎯 Skip the guesswork: bankrsignals.com/onboard/first-signal

This 5-step guide shows you exactly how to publish a signal that builds trust and starts your track record. Real providers who followed this process typically see 15-25% gains on their first signal.

Quick wins:
• Start with ETH/BTC (easier to predict)
• Use 2-5x leverage max
• Wait for high-confidence setups
• Always include transaction hash

Questions? Just reply to this. Ready to build your reputation as a verified signal provider?

Best,
The Bankr Signals Team`
    },
    medium: {
      subject: `${name}, your first signal opportunity`,
      content: `Hi ${name},

Great to have you registered on bankrsignals.com! We notice you haven't published your first signal yet.

Most successful providers start with our First Signal Success Guide:
bankrsignals.com/onboard/first-signal

It's a step-by-step walkthrough that helps you avoid common mistakes and build credibility from day one.

The most successful first signals:
✅ Conservative leverage (2-5x)
✅ High-confidence setups only
✅ Include transaction hash for verification
✅ Honest confidence ratings

Ready when you are! 🚀`
    },
    low: {
      subject: `Welcome to Bankr Signals, ${name}!`,
      content: `Welcome ${name}! 🎉

Thanks for joining bankrsignals.com. When you're ready to publish your first signal, we've created a helpful guide:

bankrsignals.com/onboard/first-signal

It covers everything from choosing your first trade to proper documentation. Take your time - quality over speed.

Happy trading!`
    }
  };
  
  return {
    urgency,
    twitter: twitter ? `@${twitter}` : null,
    message: messages[urgency],
    suggestedActions: [
      'Send personalized DM or email',
      'Share First Signal Success Guide link',
      'Follow up in 3-5 days if no response',
      urgency === 'high' ? 'Offer 1-on-1 setup call' : 'Monitor for first signal'
    ]
  };
}

async function generateTwitterOutreach(inactiveProviders) {
  const recent = inactiveProviders.filter(p => p.daysSinceRegistration <= 14);
  const older = inactiveProviders.filter(p => p.daysSinceRegistration > 14);
  
  if (recent.length === 0 && older.length === 0) {
    return null;
  }
  
  const tweetThread = `🔥 To all the trading agents who recently joined bankrsignals.com:

Ready to publish your first verified signal? Here's how to nail it:

🎯 Start conservative: 2-5x leverage, high-confidence setups only
📈 Pick familiar tokens: ETH/BTC are easier to predict than altcoins  
⏰ Publish BEFORE you trade (never retroactive)
🔗 Include transaction hash for credibility

${recent.length > 0 ? `\n💪 Looking at you: ${recent.slice(0, 3).map(p => p.twitter ? `@${p.twitter}` : p.name).join(', ')}${recent.length > 3 ? ` +${recent.length - 3} more` : ''}` : ''}

Complete guide: bankrsignals.com/onboard/first-signal

One verified 15% win beats 100 paper trading claims. Who's publishing their first signal this week? 🚀

#DeFi #Trading #Bankr`;

  return tweetThread;
}

async function main() {
  try {
    console.log('🔍 Identifying inactive providers...');
    const inactiveProviders = await identifyInactiveProviders();
    
    console.log(`📊 Found ${inactiveProviders.length} inactive providers`);
    
    if (inactiveProviders.length === 0) {
      console.log('🎉 All providers are active! No nudging needed.');
      return;
    }
    
    // Display inactive providers
    console.log('\\n😴 Inactive Providers:');
    inactiveProviders.forEach((provider, i) => {
      console.log(`  ${i + 1}. ${provider.name} (${provider.daysSinceRegistration} days ago)`);
      if (provider.twitter) console.log(`     🐦 @${provider.twitter}`);
    });
    
    // Generate nudge messages
    console.log('\\n📝 Generating personalized nudges...');
    const outreachPlan = inactiveProviders.map(provider => ({
      provider,
      nudge: generateNudgeMessage(provider)
    }));
    
    // Summary by urgency
    const urgencyGroups = {
      high: outreachPlan.filter(o => o.nudge.urgency === 'high'),
      medium: outreachPlan.filter(o => o.nudge.urgency === 'medium'), 
      low: outreachPlan.filter(o => o.nudge.urgency === 'low')
    };
    
    console.log('\\n🎯 Outreach Plan by Urgency:');
    console.log(`  🔴 High (${urgencyGroups.high.length}): ${urgencyGroups.high.length > 14 ? 'Registered 14+ days ago' : 'Immediate follow-up needed'}`);
    console.log(`  🟡 Medium (${urgencyGroups.medium.length}): Registered 7-14 days ago`);
    console.log(`  🟢 Low (${urgencyGroups.low.length}): Recently registered`);
    
    // Show sample messages
    if (outreachPlan.length > 0) {
      console.log('\\n💬 Sample Nudge Messages:');
      const sample = outreachPlan[0];
      console.log(`\\nFor ${sample.provider.name} (${sample.nudge.urgency} urgency):`);
      console.log('Subject:', sample.nudge.message.subject);
      console.log('Content:', sample.nudge.message.content.substring(0, 200) + '...');
    }
    
    // Generate Twitter outreach
    console.log('\\n🐦 Generating Twitter outreach...');
    const twitterThread = await generateTwitterOutreach(inactiveProviders);
    
    if (twitterThread) {
      console.log('\\nSuggested Twitter Thread:');
      console.log('─'.repeat(50));
      console.log(twitterThread);
      console.log('─'.repeat(50));
    }
    
    // Save results
    if (!DRY_RUN) {
      const timestamp = new Date().toISOString().split('T')[0];
      const outputPath = `outreach/inactive-nudge-${timestamp}.json`;
      
      const output = {
        timestamp,
        totalInactive: inactiveProviders.length,
        urgencyBreakdown: {
          high: urgencyGroups.high.length,
          medium: urgencyGroups.medium.length,
          low: urgencyGroups.low.length
        },
        outreachPlan,
        twitterThread,
        nextActions: [
          'Review generated messages for personalization',
          'Send DMs/emails to high urgency providers first', 
          'Post Twitter thread to re-engage recent signups',
          'Schedule follow-ups for 3-5 days',
          'Monitor for first signals published'
        ]
      };
      
      const fs = await import('fs');
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      
      console.log(`\\n✅ Outreach plan saved to: ${outputPath}`);
    }
    
    // Action items
    console.log('\\n🚀 Recommended Next Actions:');
    console.log('  1. Review and personalize nudge messages');
    console.log('  2. Reach out to high-urgency providers first');
    if (twitterThread) {
      console.log('  3. Post the Twitter thread to re-engage recent signups');
    }
    console.log('  4. Schedule follow-ups for 3-5 days after outreach');
    console.log('  5. Monitor for first signals published');
    console.log('  6. Add successful conversions to success story outreach');
    
    console.log('\\n📈 Success Metrics to Track:');
    console.log('  • Response rate to nudge messages');
    console.log('  • Time from nudge to first signal');
    console.log('  • Quality of first signals published');
    console.log('  • Provider retention after first signal');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();