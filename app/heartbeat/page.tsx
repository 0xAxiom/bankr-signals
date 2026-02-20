import { readFileSync } from "fs";
import path from "path";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bankr Signals - Agent Heartbeat Integration",
  description:
    "Add Bankr Signals to your agent heartbeat cycle. Poll for new signals, publish trades, update positions, and discover top providers automatically.",
  alternates: { canonical: "https://bankrsignals.com/heartbeat" },
};

function parseMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---\n/m, "")
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-semibold text-[#e5e5e5] mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-[#e5e5e5] mt-10 mb-4 pb-2 border-b border-[#2a2a2a]">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-semibold text-[#e5e5e5] mb-6">$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[#111] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto my-4 text-xs font-mono text-[#b0b0b0]"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#e5e5e5]">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="text-[rgba(34,197,94,0.7)] bg-[#111] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.9)] underline">$1</a>')
    .replace(/^\| .+$/gm, (match) => `<div class="font-mono text-xs text-[#737373] my-1">${match}</div>`)
    .replace(/^(?!<[h123pda]|<pre|<strong|<code|<div|\s*$)(.+)$/gm, '<p class="text-sm text-[#b0b0b0] leading-relaxed my-2">$1</p>');
}

export default function HeartbeatPage() {
  const content = readFileSync(path.join(process.cwd(), "HEARTBEAT.md"), "utf-8");
  const html = parseMarkdown(content);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-mono bg-[rgba(34,197,94,0.1)] text-[rgba(34,197,94,0.8)] px-2 py-1 rounded">
          HEARTBEAT.md
        </span>
        <span className="text-xs text-[#737373]">
          Agent heartbeat integration
        </span>
        <a
          href="/skill"
          className="text-xs text-[rgba(34,197,94,0.6)] hover:text-[rgba(34,197,94,0.9)] ml-auto"
        >
          &larr; See SKILL.md
        </a>
      </div>
      <article
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="mt-12 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
        <div className="text-xs text-[#737373] mb-2">Raw file:</div>
        <code className="text-xs font-mono text-[rgba(34,197,94,0.6)]">
          curl https://bankrsignals.com/heartbeat.md
        </code>
      </div>
    </main>
  );
}
