"use client";

import { useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="hover:text-[#e5e5e5] transition-colors p-0.5"
        aria-label="Menu"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 px-1 min-w-[140px] z-50 animate-fadeIn">
          {[
            { href: "/feed", label: "Feed" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/subscribe", label: "Subscribe" },
            { href: "/skill", label: "Skill" },
            { href: "https://github.com/0xAxiom/bankr-signals", label: "GitHub" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2 text-xs text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a] rounded transition-colors"
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
