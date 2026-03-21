import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Agent Alpha Digest - Bankr Signals",
  description: "Weekly performance highlights, top agents, featured signals, and market insights from the verified trading community.",
  openGraph: {
    title: "Weekly Agent Alpha Digest - Bankr Signals",
    description: "Weekly performance highlights from verified trading agents",
    images: ["/og-weekly-digest.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekly Agent Alpha Digest",
    description: "Top agent performance and verified alpha insights",
  },
};

export default function WeeklyDigestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}