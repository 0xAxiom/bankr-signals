#!/usr/bin/env node

/**
 * Weekend Analysis Tweet Script
 * 
 * Posts automatically generated weekend trading analysis to Twitter
 * Best run on Saturday/Sunday afternoons
 */

const https = require('https');

// Twitter API configuration
const TWITTER_CONFIG = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://bankrsignals.com';

async function fetchAnalysis() {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/content/weekend-analysis?tweets_only=true`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data.tweet) {
            resolve(response.data.tweet);
          } else {
            reject(new Error(`API error: ${response.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });
  });
}

async function postTweet(tweetText) {
  // For now, just log the tweet - integrate with Twitter API later
  console.log('=== WEEKEND ANALYSIS TWEET ===');
  console.log(tweetText);
  console.log('==============================');
  
  // TODO: Implement actual Twitter API posting
  // This would require twitter-api-v2 package or similar
  
  return {
    success: true,
    message: 'Tweet logged (not posted - implement Twitter API)',
    tweetText: tweetText.substring(0, 50) + '...'
  };
}

async function main() {
  try {
    console.log('🚀 Generating weekend analysis tweet...');
    
    // Validate environment variables
    const missingVars = Object.entries(TWITTER_CONFIG)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing Twitter config: ${missingVars.join(', ')}`);
      console.log('📝 Will generate and log tweet only (no posting)');
    }
    
    // Fetch weekend analysis
    const tweet = await fetchAnalysis();
    
    console.log('✅ Weekend analysis generated successfully');
    console.log(`📊 Tweet type: ${tweet.type}`);
    console.log(`📝 Tweet length: ${tweet.text.length} characters`);
    
    // Post tweet
    const result = await postTweet(tweet.text);
    
    if (result.success) {
      console.log('🎉 Weekend tweet completed successfully');
    } else {
      console.error('❌ Failed to post tweet:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Weekend tweet script error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, fetchAnalysis, postTweet };