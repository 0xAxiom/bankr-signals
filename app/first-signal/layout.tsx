import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publish Your First Signal - Bankr Signals",
  description: "Get personalized examples and templates to publish your first verified trading signal. Start building your track record in minutes.",
};

export default function FirstSignalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}