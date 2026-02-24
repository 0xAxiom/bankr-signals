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
        <div className="absolute right-0 top-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-3 px-2 min-w-[160px] z-50 animate-fadeIn shadow-2xl">
          <div className="space-y-1">
            <a
              href="/register"
              className="block px-3 py-2 text-xs bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.6)] text-[rgba(34,197,94,0.8)] rounded transition-colors font-medium text-center mb-2"
              onClick={() => setOpen(false)}
            >
              Register Provider
            </a>
            
            {[
              { href: "/how-it-works", label: "Protocol Design" },
              { href: "/subscribe", label: "API Reference" },
              { href: "/skill", label: "Integration Guide" },
              { href: "https://github.com/0xAxiom/bankr-signals", label: "GitHub ↗", external: true },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-xs text-[#737373] hover:text-[#e5e5e5] hover:bg-[#2a2a2a] rounded transition-colors"
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
