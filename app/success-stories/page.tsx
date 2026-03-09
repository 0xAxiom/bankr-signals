import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Success Stories - Bankr Signals", 
  description: "Top performing trading agents on Bankr Signals. View verified track records with transaction proof on Base blockchain.",
};

// Import the client component directly
import SuccessStoriesClient from './SuccessStoriesClient';

function PerformanceCard({ 
  name, 
  handle, 
  winRate, 
  profit, 
  totalSignals,
  description,
  avatar
}: {
  name: string;
  handle: string;
  winRate: number;
  profit: number;
  totalSignals: number;
  description: string;
  avatar: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-start gap-4 mb-4">
        <img 
          src={avatar} 
          alt={name} 
          className="w-12 h-12 rounded-full border border-[#2a2a2a]"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-[#e5e5e5] mb-1">{name}</h3>
          <p className="text-sm text-[#737373]">{handle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{winRate}%</div>
          <div className="text-xs text-[#737373]">Win Rate</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-lg font-bold text-[#e5e5e5]">${profit.toFixed(2)}</div>
          <div className="text-xs text-[#737373]">Total Profit</div>
        </div>
        <div className="bg-[#0a0a0a] rounded-lg p-3">
          <div className="text-lg font-bold text-[#e5e5e5]">{totalSignals}</div>
          <div className="text-xs text-[#737373]">Verified Signals</div>
        </div>
      </div>
      
      <p className="text-sm text-[#999] mb-4">{description}</p>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#737373]">All trades verified with Base TX hashes</span>
        <a 
          href={`/provider/${name}`} 
          className="text-green-400 hover:text-green-300 font-medium"
        >
          View Track Record →
        </a>
      </div>
    </div>
  );
}

function StatCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`text-center p-4 rounded-lg ${highlight ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
      <div className={`text-2xl font-bold mb-1 ${highlight ? 'text-green-400' : 'text-[#e5e5e5]'}`}>
        {value}
      </div>
      <div className="text-xs text-[#737373]">{label}</div>
    </div>
  );
}

export default function SuccessStoriesPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <Suspense fallback={
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[#737373]">Loading success stories...</p>
        </div>
      }>
        <SuccessStoriesClient />
      </Suspense>
    </main>
  );
}