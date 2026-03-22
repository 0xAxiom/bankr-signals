#!/usr/bin/env node

/**
 * Daily Signal Tweet Script
 * Automatically tweets the "Signal of the Day" from bankrsignals.com
 * Usage: node daily-signal-tweet.js [--dry-run]
 */

import https from 'https';
import { execSync } from 'child_process';
import fs from 'fs';

async function fetchSignalOfDay() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bankrsignals.com',
      port: 443,
      path: '/api/signal-of-day?tweet=true',
      method: 'GET',
      headers: {
        'User-Agent': 'BankrSignals-Bot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    req.end();
  });
}

async function postTweet(text) {
  try {
    // Use the existing twitter.sh script
    const scriptPath = `${process.env.HOME}/clawd/scripts/twitter.sh`;
    execSync(`"${scriptPath}" tweet "${text.replace(/"/g, '\\"')}"`, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return true;
  } catch (error) {
    console.error('Failed to post tweet:', error.message);
    return false;
  }
}

function logActivity(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp}: ${message}\n`;
  
  try {
    const logPath = `${process.cwd()}/scripts/signal-of-day.log`;
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('Failed to write log:', err.message);
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🚀 Daily Signal Tweet Bot Starting...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  
  try {
    // Fetch signal of the day
    console.log('📊 Fetching signal of the day...');
    const response = await fetchSignalOfDay();
    
    if (!response.success) {
      throw new Error(`API error: ${response.error || 'Unknown error'}`);
    }
    
    const { tweet, signal, provider } = response.data;
    
    if (!tweet) {
      console.log('❌ No tweet text returned from API');
      logActivity('No tweet generated - no suitable signal found');
      return;
    }
    
    if (!signal || !provider) {
      console.log('⚠️  Using fallback tweet (no active signals)');
    } else {
      console.log(`✅ Signal found: ${provider.name} - ${signal.action} ${signal.token}`);
    }
    
    console.log('\n📝 Generated tweet:');
    console.log('─'.repeat(50));
    console.log(tweet);
    console.log('─'.repeat(50));
    console.log(`Length: ${tweet.length} characters`);
    
    if (isDryRun) {
      console.log('\n✅ DRY RUN: Tweet would be posted above');
      logActivity(`DRY RUN: Generated tweet for ${signal ? `${provider.name} ${signal.action} ${signal.token}` : 'fallback'}`);
      return;
    }
    
    // Post the tweet
    console.log('\n🐦 Posting to Twitter...');
    const success = await postTweet(tweet);
    
    if (success) {
      console.log('✅ Tweet posted successfully!');
      logActivity(`SUCCESS: Posted tweet for ${signal ? `${provider.name} ${signal.action} ${signal.token}` : 'fallback'}`);
    } else {
      console.log('❌ Failed to post tweet');
      logActivity(`FAILED: Tweet posting failed for ${signal ? `${provider.name} ${signal.action} ${signal.token}` : 'fallback'}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    logActivity(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Interrupted by user');
  process.exit(0);
});

main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});