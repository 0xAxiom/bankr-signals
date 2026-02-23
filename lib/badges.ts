/**
 * Badge & achievement system for signal providers.
 */

import { ParsedTrade } from "./signals";

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const BADGE_COLORS: Record<Badge["rarity"], string> = {
  common: "border-[#737373] text-[#737373]",
  rare: "border-[rgba(59,130,246,0.6)] text-[rgba(59,130,246,0.8)]",
  epic: "border-[rgba(168,85,247,0.6)] text-[rgba(168,85,247,0.8)]",
  legendary: "border-[rgba(234,179,8,0.6)] text-[rgba(234,179,8,0.8)]",
};

export function getBadgeColor(rarity: Badge["rarity"]): string {
  return BADGE_COLORS[rarity];
}

export function computeBadges(trades: ParsedTrade[]): Badge[] {
  const badges: Badge[] = [];
  const closed = trades.filter(
    (t) => t.status === "closed" && t.pnl !== undefined
  );
  const wins = closed.filter((t) => (t.pnl || 0) > 0);

  // First Signal
  if (trades.length >= 1) {
    badges.push({
      id: "first-signal",
      name: "First Signal",
      icon: "📡",
      description: "Published first trading signal",
      rarity: "common",
    });
  }

  // Win Streaks
  let streak = 0;
  let maxStreak = 0;
  for (const t of closed) {
    if ((t.pnl || 0) > 0) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }

  if (maxStreak >= 3) {
    badges.push({
      id: "streak-3",
      name: "Hot Streak",
      icon: "🔥",
      description: "3 consecutive winning trades",
      rarity: "common",
    });
  }
  if (maxStreak >= 5) {
    badges.push({
      id: "streak-5",
      name: "On Fire",
      icon: "🔥",
      description: "5 consecutive winning trades",
      rarity: "rare",
    });
  }
  if (maxStreak >= 10) {
    badges.push({
      id: "streak-10",
      name: "Unstoppable",
      icon: "💎",
      description: "10 consecutive winning trades",
      rarity: "legendary",
    });
  }

  // Win Rate
  if (closed.length >= 5) {
    const winRate = wins.length / closed.length;
    if (winRate >= 0.8) {
      badges.push({
        id: "sharpshooter",
        name: "Sharpshooter",
        icon: "🎯",
        description: "80%+ win rate over 5+ trades",
        rarity: "rare",
      });
    }
    if (winRate === 1 && closed.length >= 5) {
      badges.push({
        id: "perfect",
        name: "Perfect Record",
        icon: "👑",
        description: "100% win rate with 5+ trades",
        rarity: "legendary",
      });
    }
  }

  // Big PnL trades
  const best = Math.max(0, ...closed.map((t) => t.pnl || 0));
  if (best >= 50) {
    badges.push({
      id: "big-win",
      name: "50% Club",
      icon: "📈",
      description: "Single trade with 50%+ return",
      rarity: "rare",
    });
  }
  if (best >= 100) {
    badges.push({
      id: "double-up",
      name: "Double Up",
      icon: "🚀",
      description: "Single trade with 100%+ return",
      rarity: "epic",
    });
  }
  if (best >= 500) {
    badges.push({
      id: "whale-trade",
      name: "Whale Trade",
      icon: "🐋",
      description: "Single trade with 500%+ return",
      rarity: "legendary",
    });
  }

  // Volume
  if (trades.length >= 10) {
    badges.push({
      id: "active-trader",
      name: "Active Trader",
      icon: "⚡",
      description: "10+ signals published",
      rarity: "common",
    });
  }
  if (trades.length >= 50) {
    badges.push({
      id: "veteran",
      name: "Veteran",
      icon: "🏆",
      description: "50+ signals published",
      rarity: "epic",
    });
  }

  // Leverage
  const maxLeverage = Math.max(0, ...trades.map((t) => t.leverage || 0));
  if (maxLeverage >= 10) {
    badges.push({
      id: "degen",
      name: "Degen",
      icon: "🎰",
      description: "Used 10x+ leverage",
      rarity: "rare",
    });
  }

  // Verified on-chain
  const verifiedCount = trades.filter((t) => t.txHash).length;
  if (verifiedCount >= 1) {
    badges.push({
      id: "verified",
      name: "On-Chain Verified",
      icon: "✓",
      description: "At least 1 trade verified on-chain",
      rarity: "common",
    });
  }
  if (verifiedCount >= 5) {
    badges.push({
      id: "transparent",
      name: "Fully Transparent",
      icon: "🔍",
      description: "5+ trades verified on-chain",
      rarity: "rare",
    });
  }

  return badges;
}
