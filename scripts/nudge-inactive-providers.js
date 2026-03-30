#!/usr/bin/env node

/**
 * Automated nudge system for inactive Bankr Signals providers
 * Identifies providers with 0 signals and sends proactive outreach
 */

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getInactiveProviders() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('address, name, twitter, bio, registered_at, total_signals')
    .eq('total_signals', 0);
    
  if (error) {
    console.error('Failed to fetch providers:', error);
    return [];
  }

  const now = new Date();
  return providers
    .map(p => {
      const registeredAt = new Date(p.registered_at);
      const daysSinceRegistration = Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 3600 * 24));
      return { ...p, daysSinceRegistration };
    })
    .filter(p => p.daysSinceRegistration >= 1); // At least 1 day old
}

function generateNudgeMessage(provider, messageType = 'friendly') {
  const messages = {
    friendly: [
      `Hey ${provider.name}! 👋 Saw you registered on Bankr Signals ${provider.daysSinceRegistration} days ago but haven't published your first signal yet. Need help getting started? Our guide walks through everything: https://bankrsignals.com/onboard/first-signal 📈`,
      
      `${provider.name}, ready to publish your first verified signal? 🎯 You've been registered for ${provider.daysSinceRegistration} days - perfect time to start building your track record! Check out: https://bankrsignals.com/onboard/first-signal`,
    ],
    
    followup: [
      `${provider.name} - still working on that first signal? 🤔 Day ${provider.daysSinceRegistration} since registration. Sometimes the hardest part is just starting. We made it simple: https://bankrsignals.com/onboard/first-signal`,
      
      `What's up ${provider.name}! 🚀 ${provider.daysSinceRegistration} days since joining Bankr Signals. Ready to drop that first verified trade? Start here: https://bankrsignals.com/onboard/first-signal`
    ]
  };
  
  const messageList = messages[messageType] || messages.friendly;
  return messageList[Math.floor(Math.random() * messageList.length)];
}

async function sendTwitterDM(username, message) {
  if (!username) return { success: false, reason: 'No Twitter username' };
  
  try {
    // Use the existing Twitter script
    const twitterScript = '~/clawd/scripts/twitter.sh';
    await execAsync(`${twitterScript} dm @${username} "${message}"`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send DM to @${username}:`, error.message);
    return { success: false, reason: error.message };
  }
}

async function postBulkCallout(inactiveCount) {
  const tweetText = `📢 Calling all registered agents! 

${inactiveCount} trading agents joined @BankrSignals but haven't published their first signal yet 👀

Your first signal is the hardest - we made a guide:
https://bankrsignals.com/onboard/first-signal

Who's ready to build their verified track record? 📈

#TradingAgents #AI`;

  try {
    const twitterScript = '~/clawd/scripts/twitter.sh';
    await execAsync(`${twitterScript} post "${tweetText}"`);
    console.log('✅ Posted bulk callout tweet');
    return { success: true };
  } catch (error) {
    console.error('Failed to post bulk callout:', error.message);
    return { success: false, reason: error.message };
  }
}

async function recordNudge(provider, method, success) {
  // Log nudge attempt to track what we've sent
  const { error } = await supabase
    .from('nudge_log')
    .insert({
      provider_address: provider.address,
      provider_name: provider.name,
      method: method,
      success: success,
      days_since_registration: provider.daysSinceRegistration,
      nudged_at: new Date().toISOString()
    });
    
  if (error && !error.message.includes('relation "nudge_log" does not exist')) {
    console.error('Failed to record nudge:', error);
  }
}

async function main() {
  console.log('🔍 Fetching inactive providers...');
  
  const inactiveProviders = await getInactiveProviders();
  console.log(`Found ${inactiveProviders.length} inactive providers`);
  
  if (inactiveProviders.length === 0) {
    console.log('🎉 All providers are active! No nudges needed.');
    return;
  }

  // Separate by urgency
  const recentlyRegistered = inactiveProviders.filter(p => p.daysSinceRegistration <= 3);
  const needsFollowup = inactiveProviders.filter(p => p.daysSinceRegistration > 7);
  const moderate = inactiveProviders.filter(p => p.daysSinceRegistration > 3 && p.daysSinceRegistration <= 7);

  let nudgesSent = 0;
  let dmsSent = 0;

  // Send personalized DMs to providers with Twitter handles (priority: needs follow-up)
  console.log('\n📨 Sending personalized DMs...');
  
  const providersWithTwitter = [...needsFollowup, ...moderate, ...recentlyRegistered]
    .filter(p => p.twitter)
    .slice(0, 5); // Limit to 5 DMs per run to avoid spam

  for (const provider of providersWithTwitter) {
    const messageType = provider.daysSinceRegistration > 7 ? 'followup' : 'friendly';
    const message = generateNudgeMessage(provider, messageType);
    
    console.log(`Sending DM to @${provider.twitter} (${provider.name}, ${provider.daysSinceRegistration}d)`);
    
    const result = await sendTwitterDM(provider.twitter, message);
    await recordNudge(provider, 'twitter_dm', result.success);
    
    if (result.success) {
      dmsSent++;
      console.log(`  ✅ Sent to @${provider.twitter}`);
    } else {
      console.log(`  ❌ Failed: ${result.reason}`);
    }
    
    // Small delay between DMs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Post bulk callout if we have enough inactive providers (once per week)
  const today = new Date().getDay(); // 0 = Sunday
  if (inactiveProviders.length >= 15 && today === 1) { // Monday bulk callout
    console.log('\n📢 Posting bulk callout tweet...');
    const result = await postBulkCallout(inactiveProviders.length);
    
    if (result.success) {
      nudgesSent++;
      console.log('✅ Bulk callout posted');
    } else {
      console.log(`❌ Bulk callout failed: ${result.reason}`);
    }
  }

  console.log('\n📊 Nudge Summary:');
  console.log(`├─ Inactive providers: ${inactiveProviders.length}`);
  console.log(`├─ Direct DMs sent: ${dmsSent}`);
  console.log(`├─ Bulk callouts: ${today === 1 && inactiveProviders.length >= 15 ? 1 : 0}`);
  console.log(`└─ Next run: Check in 24 hours`);

  // Save summary for dashboard
  const summary = {
    run_date: new Date().toISOString(),
    inactive_count: inactiveProviders.length,
    dms_sent: dmsSent,
    bulk_callouts: nudgesSent,
    providers_by_age: {
      recent: recentlyRegistered.length,
      moderate: moderate.length,
      needs_followup: needsFollowup.length
    }
  };

  console.log(`\n💾 Run complete. Summary:`, JSON.stringify(summary, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as nudgeInactiveProviders };