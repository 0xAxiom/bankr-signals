type Tier = "live" | "recent" | "idle" | "stale" | "never";

function classify(hours: number | null): Tier {
  if (hours === null) return "never";
  if (hours < 24) return "live";
  if (hours < 24 * 7) return "recent";
  if (hours < 24 * 30) return "idle";
  return "stale";
}

const TIER_META: Record<Tier, { color: string; label: string; title: string }> = {
  live: {
    color: "rgba(34,197,94,0.9)",
    label: "Active",
    title: "Signal published in last 24 hours",
  },
  recent: {
    color: "rgba(132,204,22,0.85)",
    label: "Recent",
    title: "Signal published in last 7 days",
  },
  idle: {
    color: "rgba(234,179,8,0.85)",
    label: "Idle",
    title: "No signals in over a week",
  },
  stale: {
    color: "rgba(239,68,68,0.75)",
    label: "Stale",
    title: "No signals in over 30 days",
  },
  never: {
    color: "rgba(115,115,115,0.6)",
    label: "Inactive",
    title: "Provider has never published a signal",
  },
};

export function ActivityDot({
  hours,
  size = 8,
  pulse = true,
}: {
  hours: number | null;
  size?: number;
  pulse?: boolean;
}) {
  const tier = classify(hours);
  const meta = TIER_META[tier];
  const shouldPulse = pulse && tier === "live";
  return (
    <span
      title={meta.title}
      aria-label={meta.label}
      className={`inline-block rounded-full shrink-0 ${shouldPulse ? "animate-pulse" : ""}`}
      style={{
        width: size,
        height: size,
        background: meta.color,
        boxShadow: tier === "live" ? `0 0 6px ${meta.color}` : undefined,
      }}
    />
  );
}

export function ActivityBadge({ hours }: { hours: number | null }) {
  const tier = classify(hours);
  const meta = TIER_META[tier];
  return (
    <span
      title={meta.title}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide"
      style={{ color: meta.color, background: `${meta.color.replace(/[\d.]+\)$/, "0.08)")}` }}
    >
      <ActivityDot hours={hours} size={6} />
      {meta.label}
    </span>
  );
}

export function activityTier(hours: number | null): Tier {
  return classify(hours);
}
