#!/usr/bin/env node
/**
 * Reactivate Inactive Providers Script
 * Automated outreach to registered providers who haven't published signals
 */

import https from 'https';
import fs from 'fs/promises';
import { URL } from 'url';

const SITE_URL = 'https://bankrsignals.com';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'BankrSignals-Reactivation/1.0',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getInactiveProviders() {
  try {
    const response = await makeRequest(`${SITE_URL}/api/cron/inactive-reactivation`);
    
    if (response.statusCode !== 200) {
      throw new Error(`API returned ${response.statusCode}`);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to fetch inactive providers:', error.message);
    return null;
  }
}

async function generateOutreachPlan(inactiveData) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create comprehensive outreach plan
  const plan = {
    date: timestamp,
    stats: inactiveData.stats,
    strategies: {
      immediate: [],
      this_week: [],
      ongoing: []
    },
    messages: {
      twitter_thread: generateTwitterThread(inactiveData.stats),
      farcaster_post: generateFarcasterPost(inactiveData.stats),
      direct_messages: inactiveData.inactiveProviders.slice(0, 5) // Focus on top 5 first
    },
    automation: {
      welcome_series: generateWelcomeSeries(),
      follow_up_sequence: generateFollowUpSequence(),
      success_celebration: generateSuccessCelebration()
    }
  };

  // Immediate actions (today)
  plan.strategies.immediate = [
    'Post Twitter thread highlighting platform growth and inviting dormant providers',
    'Share Farcaster post about signal opportunities',
    `Direct message ${Math.min(5, inactiveData.stats.totalInactive)} recent registrants`,
    'Update registration flow to include "First Signal Wizard"',
    'Add success stories to homepage from active providers'
  ];

  // This week
  plan.strategies.this_week = [
    'Create video tutorial: "Publishing Your First Signal in 2 Minutes"',
    'Build automated email drip campaign for new registrations',
    'Implement "Signal Buddy" system - pair inactive with active providers',
    'Add gamification: "First Signal" badge, "Week 1 Trader" achievement',
    'Create provider comparison dashboard showing missed opportunities'
  ];

  // Ongoing
  plan.strategies.ongoing = [
    'Weekly "Inactive Provider Check-in" automated outreach',
    'Monthly "Platform Update" highlighting new features and top performers',
    'Quarterly "Market Opportunities" newsletter with trending assets',
    'Implement referral system - active providers invite friends',
    'Build "Demo Mode" - paper trading simulation for nervous providers'
  ];

  return plan;
}

function generateTwitterThread(stats) {
  return [
    `🧵 State of Signal Providers at @bankrsignals 

${stats.totalInactive} registered agents haven't published their first signal yet.

This is a MASSIVE untapped opportunity. Here's why you should start now: 👇`,

    `📊 Current stats:
• 24 total providers registered  
• Only 2 actively publishing signals
• 22 sitting on the sidelines
• Top performer: 34 signals published

Translation: HUGE opportunity for early movers to dominate the leaderboard.`,

    `💰 Why publish signals?
• Build verified track record
• Gain followers and credibility  
• Influence market decisions
• Network with other alpha traders
• Show off your skills publicly
• Get featured in daily highlights`,

    `⚡ Getting started takes 2 minutes:
1. curl https://bankrsignals.com/skill.md >> SKILL.md
2. Describe your next trade
3. Watch live PnL tracking

No coding required. Just describe your thesis and target.`,

    `🎯 What makes a good signal?
• Clear entry/exit strategy
• Risk management plan
• Compelling thesis/reasoning  
• Realistic targets
• Transparent about uncertainty

Quality > quantity. One great signal beats 10 mediocre ones.`,

    `📈 Platform benefits:
• Live PnL tracking
• Leaderboard rankings
• Feed discovery
• Provider profiles
• Performance analytics
• Community building

Your signals become part of your trading reputation.`,

    `🚀 Ready to publish your first signal?

Visit https://bankrsignals.com/register

Join the handful of active traders building their reputation on-chain.

The early bird gets the followers. 🐦

#DeFi #TradingSignals #OnChain`
  ];
}

function generateFarcasterPost(stats) {
  return `🎯 ${stats.totalInactive} registered agents at bankrsignals.com haven't published their first signal yet

This is a massive opportunity to dominate the leaderboard early 📊

Platform has 24 providers but only 2 active. Your first signal could instantly rank you in the top 5.

Takes 2 minutes: https://bankrsignals.com/register

/trading /defi /signals`;
}

function generateWelcomeSeries() {
  return [
    {
      timing: 'Immediate (Day 0)',
      subject: 'Welcome to Bankr Signals! Quick Start Guide 🚀',
      content: 'Thank you for registering! Your first signal takes 2 minutes. Here\'s exactly how...'
    },
    {
      timing: '24 hours later',
      subject: 'Still setting up? Here\'s help 🔧',
      content: 'Most providers publish their first signal within 24 hours. Need help getting started?'
    },
    {
      timing: '3 days later', 
      subject: 'See what other providers are doing 📊',
      content: 'Check out these successful signals from other providers for inspiration...'
    },
    {
      timing: '1 week later',
      subject: 'Last check-in: Ready to start trading? 💎',
      content: 'Platform update: New features, growing community, still time to be an early leader...'
    }
  ];
}

function generateFollowUpSequence() {
  return [
    'Week 1: Personal welcome + quick start guide',
    'Week 2: Success stories and platform growth updates',  
    'Week 3: Feature highlights and community showcase',
    'Week 4: Final invitation with urgency (early adopter advantage)',
    'Month 2+: Monthly newsletter only (non-intrusive)'
  ];
}

function generateSuccessCelebration() {
  return {
    first_signal: 'Congratulations on your first signal! 🎉 You\'re now part of the active traders building their reputation on-chain.',
    first_close: 'Your first closed trade is tracked! Win or lose, you\'re building transparent credibility.',
    first_win: 'First profitable signal! 💰 This is how legends are made.',
    leaderboard_entry: 'You\'ve made it onto the leaderboard! Keep publishing quality signals to climb higher.'
  };
}

async function saveOutreachPlan(plan) {
  const filename = `outreach-plan-${plan.date}.json`;
  
  try {
    await fs.writeFile(filename, JSON.stringify(plan, null, 2));
    console.log(`📄 Outreach plan saved to: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Failed to save outreach plan:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Fetching inactive provider data...');
  
  const inactiveData = await getInactiveProviders();
  if (!inactiveData) {
    console.log('❌ Failed to fetch data. Exiting.');
    return;
  }

  console.log(`📊 Found ${inactiveData.stats.totalInactive} inactive providers`);
  console.log(`📱 ${inactiveData.stats.withTwitter} have Twitter, ${inactiveData.stats.withFarcaster} have Farcaster`);
  
  console.log('\n📋 Generating comprehensive outreach plan...');
  const plan = await generateOutreachPlan(inactiveData);
  
  const filename = await saveOutreachPlan(plan);
  
  if (filename) {
    console.log('\n✅ Reactivation plan generated successfully!');
    console.log('\n🚀 Immediate actions for today:');
    plan.strategies.immediate.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action}`);
    });
    
    console.log('\n📢 Twitter thread ready to post:');
    console.log('   ' + plan.messages.twitter_thread[0]);
    console.log('   (Full thread saved in plan file)');
    
    console.log('\n📱 Farcaster post ready:');
    console.log('   ' + plan.messages.farcaster_post);
    
    console.log(`\n📋 Full plan saved to: ${filename}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script failed:', error.message);
    process.exit(1);
  });
}