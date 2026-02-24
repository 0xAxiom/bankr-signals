"use client";

import { useState } from "react";

export function ShareEmbed({ signalId }: { signalId: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const url = `https://bankrsignals.com/signal/${signalId}`;
  const embedUrl = `https://bankrsignals.com/embed/${signalId}`;
  const embedCode = `<iframe src="${embedUrl}" width="400" height="220" frameborder="0" style="border-radius:12px;border:1px solid #2a2a2a;"></iframe>`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
      <div className="text-xs text-[#555] uppercase tracking-wider mb-4">Share & Embed</div>
      
      <div className="space-y-3">
        {/* Signal URL */}
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-[rgba(34,197,94,0.6)] bg-[#111] border border-[#2a2a2a] rounded px-3 py-2 flex-1 break-all">
            {url}
          </code>
          <button
            onClick={() => copy(url, "url")}
            className="text-xs font-mono px-3 py-2 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] hover:border-[#555] transition-all shrink-0"
          >
            {copied === "url" ? "✓" : "Copy"}
          </button>
        </div>

        {/* Embed code */}
        <div>
          <div className="text-[10px] text-[#444] mb-1">Embed on your site:</div>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-[#555] bg-[#111] border border-[#2a2a2a] rounded px-3 py-2 flex-1 break-all overflow-hidden">
              {embedCode}
            </code>
            <button
              onClick={() => copy(embedCode, "embed")}
              className="text-xs font-mono px-3 py-2 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] hover:border-[#555] transition-all shrink-0"
            >
              {copied === "embed" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Quick share links */}
        <div className="flex gap-2 pt-1">
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("Check out this verified trading signal on Bankr Signals")}`}
            target="_blank"
            rel="noopener"
            className="text-[10px] font-mono px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] hover:border-[#555] transition-all"
          >
            Share on X
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener"
            className="text-[10px] font-mono px-3 py-1.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#737373] hover:text-[#e5e5e5] hover:border-[#555] transition-all"
          >
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
