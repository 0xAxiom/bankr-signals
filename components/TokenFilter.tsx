"use client";

const TOKENS = ["ETH", "BTC", "SOL", "DOGE", "PEPE", "WIF", "BONK", "ARB", "OP", "AVAX"];

interface TokenFilterProps {
  selected: string | null;
  onChange: (token: string | null) => void;
}

export function TokenFilter({ selected, onChange }: TokenFilterProps) {
  const chips: { key: string | null; label: string }[] = [
    { key: null, label: "All" },
    ...TOKENS.map((t) => ({ key: t, label: t })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
      {chips.map((chip) => {
        const isActive = selected === chip.key;
        return (
          <button
            key={chip.label}
            onClick={() => onChange(chip.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all border ${
              isActive
                ? "bg-[rgba(34,197,94,0.15)] text-[rgba(34,197,94,0.9)] border-[rgba(34,197,94,0.3)]"
                : "bg-[#1a1a1a] text-[#737373] border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-[#e5e5e5]"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
