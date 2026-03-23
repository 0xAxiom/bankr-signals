#!/usr/bin/env node
/**
 * Check current bankrsignals.com status
 */

import { dbGetProviders, dbGetProviderStats, dbGetSignals } from '../lib/db.ts';

(async () => {
  try {
    const providers = await dbGetProviders();
    const signals = await dbGetSignals(100);
    
    const activeProviders = [];
    const inactiveProviders = [];
    
    for (const provider of providers) {
      const stats = await dbGetProviderStats(provider.address);
      if (stats.total_signals > 0) {
        activeProviders.push({ ...provider, ...stats });
      } else {
        inactiveProviders.push(provider);
      }
    }
    
    console.log('=== BANKR SIGNALS STATUS ===');
    console.log(`Total providers: ${providers.length}`);
    console.log(`Active providers (with signals): ${activeProviders.length}`);
    console.log(`Inactive providers (registered but no signals): ${inactiveProviders.length}`);
    console.log(`Total signals published: ${signals.length}`);
    console.log();
    
    if (activeProviders.length > 0) {
      console.log('📈 ACTIVE PROVIDERS:');
      activeProviders.forEach(p => {
        console.log(`  • ${p.name}: ${p.total_signals} signals, ${p.win_rate}% win rate, ${p.total_pnl_usd?.toFixed(2) || 'N/A'} USD PnL`);
      });
      console.log();
    }
    
    if (inactiveProviders.length > 0) {
      console.log('😴 INACTIVE PROVIDERS (registered but never published):');
      inactiveProviders.slice(0, 10).forEach(p => {
        const regDate = p.registered_at?.split('T')[0] || 'Unknown';
        console.log(`  • ${p.name} (registered ${regDate})`);
      });
      if (inactiveProviders.length > 10) {
        console.log(`  ... and ${inactiveProviders.length - 10} more`);
      }
      console.log();
    }
    
    if (signals.length > 0) {
      const recentSignals = signals.slice(0, 5);
      console.log('🔥 RECENT SIGNALS:');
      recentSignals.forEach(s => {
        const date = new Date(s.timestamp).toLocaleDateString();
        console.log(`  • ${s.action} ${s.token} by ${s.provider.substring(0, 8)}... (${date})`);
      });
    }
    
    // Recommendations
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    if (inactiveProviders.length > activeProviders.length * 3) {
      console.log('  • HIGH PRIORITY: Convert inactive providers - too many registered but never published');
    }
    if (activeProviders.length < 5) {
      console.log('  • Agent onboarding - need more active signal publishers');
    }
    if (signals.length < 50) {
      console.log('  • Content generation - need more signal volume');
    }
    
  } catch (error) {
    console.error('Error checking status:', error.message);
    console.log('\nUsing development mode with mock data:');
    console.log('Run `npm run dev` to check if the site is working in development mode');
  }
})();