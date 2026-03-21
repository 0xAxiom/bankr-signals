#!/usr/bin/env node

/**
 * Activate Dormant Agents Script
 * 
 * This script identifies agents who registered but haven't published signals
 * and generates personalized outreach to help them get started.
 * 
 * Usage:
 *   node scripts/activate-dormant-agents.js [--dry-run] [--days=7] [--format=json]
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const days = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1]) || 7;
const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'json';

console.log('🤖 Bankr Signals - Dormant Agent Activation');
console.log('==========================================');
console.log(`📅 Looking for agents registered in last ${days} days`);
console.log(`🧪 Dry run: ${isDryRun ? 'YES' : 'NO'}`);
console.log(`📄 Format: ${format}`);
console.log('');

async function fetchDormantAgents() {
  try {
    const url = `https://bankrsignals.com/api/onboarding/dormant-agents?action=identify&days=${days}`;
    console.log(`📡 Fetching dormant agents: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch dormant agents:', error.message);
    return null;
  }
}

async function generateOutreachMessages() {
  try {
    const url = `https://bankrsignals.com/api/onboarding/dormant-agents?action=generate-outreach&days=${days}&format=${format}`;
    console.log(`📝 Generating outreach messages: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (format === 'twitter-thread') {
      const twitterThread = await response.text();
      return { twitterThread };
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('❌ Failed to generate outreach messages:', error.message);
    return null;
  }
}

async function main() {
  // Step 1: Identify dormant agents
  console.log('🔍 Step 1: Identifying dormant agents...');
  const dormantData = await fetchDormantAgents();
  
  if (!dormantData) {
    console.log('❌ Could not fetch dormant agents. Exiting.');
    return;
  }
  
  console.log(`📊 Found ${dormantData.total || 0} dormant agents`);
  
  if (dormantData.total === 0) {
    console.log('🎉 No dormant agents found! Everyone is actively publishing signals.');
    return;
  }
  
  // Display dormant agents summary
  console.log('\\n📋 Dormant Agents Summary:');
  dormantData.dormant_agents?.forEach((agent, i) => {
    console.log(`  ${i + 1}. ${agent.name} (${agent.address.slice(0, 8)}...)`);
    console.log(`     📅 Registered ${agent.daysSinceRegistration} days ago`);
    if (agent.twitter) console.log(`     🐦 Twitter: @${agent.twitter}`);
    console.log('');
  });
  
  // Step 2: Generate outreach messages
  console.log('📝 Step 2: Generating personalized outreach...');
  const outreachData = await generateOutreachMessages();
  
  if (!outreachData) {
    console.log('❌ Could not generate outreach messages. Exiting.');
    return;
  }
  
  // Step 3: Save to files and display actions
  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = path.join(process.cwd(), 'outreach');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (format === 'twitter-thread' && outreachData.twitterThread) {
    const threadFile = path.join(outputDir, `twitter-thread-${timestamp}.txt`);
    
    if (!isDryRun) {
      fs.writeFileSync(threadFile, outreachData.twitterThread);
      console.log(`✅ Twitter thread saved to: ${threadFile}`);
    } else {
      console.log('🧪 [DRY RUN] Would save Twitter thread:');
    }
    
    console.log('\\n🐦 Generated Twitter Thread:');
    console.log('─'.repeat(50));
    console.log(outreachData.twitterThread);
    console.log('─'.repeat(50));
    
  } else if (outreachData.outreach_messages) {
    const messagesFile = path.join(outputDir, `dormant-outreach-${timestamp}.json`);
    
    if (!isDryRun) {
      fs.writeFileSync(messagesFile, JSON.stringify(outreachData, null, 2));
      console.log(`✅ Outreach messages saved to: ${messagesFile}`);
    } else {
      console.log('🧪 [DRY RUN] Would save outreach messages to JSON file');
    }
    
    // Display summary
    console.log('\\n📊 Outreach Summary:');
    console.log(`   Welcome messages: ${outreachData.summary?.welcome_needed || 0}`);
    console.log(`   Gentle nudges: ${outreachData.summary?.gentle_nudge_needed || 0}`);
    console.log(`   Re-engagement: ${outreachData.summary?.re_engagement_needed || 0}`);
    
    // Show sample messages
    console.log('\\n💬 Sample Generated Messages:');
    outreachData.outreach_messages?.slice(0, 2).forEach((msg, i) => {
      console.log(`\\n  ${i + 1}. ${msg.provider.name} (${msg.urgency_level}):`);
      console.log('     ' + msg.message.split('\\n')[0] + '...');
      console.log(`     🎯 Suggested: ${msg.suggested_actions[0]}`);
    });
  }
  
  // Step 4: Next actions
  console.log('\\n🚀 Next Actions:');
  
  if (isDryRun) {
    console.log('   • Remove --dry-run to actually save files');
  } else {
    console.log('   • Review generated messages in ./outreach/ directory');
  }
  
  console.log('   • Copy messages for manual outreach');
  console.log('   • Post Twitter thread if generated');
  console.log('   • Schedule follow-ups in 2-3 days');
  console.log('   • Track responses and update provider notes');
  
  console.log('\\n✨ Agent activation campaign ready!');
}

// Run the script
main().catch(console.error);