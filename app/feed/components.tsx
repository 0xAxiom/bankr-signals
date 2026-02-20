"use client";

import { useState, useEffect } from "react";

interface Sparkline {
  points: number[];
}

export function Sparkline({ points }: Sparkline) {
  if (points.length < 2) return <div className="w-16 h-6 bg-[#1a1a1a] rounded"></div>;
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  
  const pathData = points
    .map((point, i) => {
      const x = (i / (points.length - 1)) * 60; // 60px wide
      const y = 20 - ((point - min) / range) * 16; // 20px tall, 2px margin
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    })
    .join(" ");

  const isPositive = points[points.length - 1] >= points[0];

  return (
    <svg width="60" height="20" className="flex-shrink-0">
      <path
        d={pathData}
        fill="none"
        stroke={isPositive ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface ConfidenceMeterProps {
  confidence: number; // 0-100
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const clampedConfidence = Math.max(0, Math.min(100, confidence));
  const width = `${clampedConfidence}%`;
  
  return (
    <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-[rgba(239,68,68,0.6)] via-[rgba(234,179,8,0.6)] to-[rgba(34,197,94,0.6)] rounded-full transition-all duration-300"
        style={{ width }}
      />
    </div>
  );
}

interface ExpandableReasoningProps {
  reasoning: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ExpandableReasoning({ reasoning, isExpanded, onToggle }: ExpandableReasoningProps) {
  if (!reasoning) return null;
  
  const preview = reasoning.length > 120 ? reasoning.slice(0, 120) + "..." : reasoning;
  
  return (
    <div className="mt-3 text-xs">
      <div 
        className="text-[#737373] cursor-pointer hover:text-[#e5e5e5] transition-colors select-none"
        onClick={onToggle}
      >
        <span className="font-medium">Thesis:</span> {isExpanded ? reasoning : preview}
        {reasoning.length > 120 && (
          <span className="ml-1 text-[rgba(34,197,94,0.6)]">
            {isExpanded ? " (click to collapse)" : " (click to expand)"}
          </span>
        )}
      </div>
    </div>
  );
}

interface RelativeTimestampProps {
  timestamp: string;
}

export function RelativeTimestamp({ timestamp }: RelativeTimestampProps) {
  function calcTimeAgo() {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const [timeAgo, setTimeAgo] = useState(calcTimeAgo);

  // Issue #15: Move interval to useEffect with cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(calcTimeAgo());
    }, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span>{timeAgo}</span>;
}