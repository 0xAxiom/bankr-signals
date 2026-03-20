"use client";

import { useWallet } from "@/components/WalletContext";
import FollowButton from "@/components/FollowButton";

interface ProviderPageClientProps {
  providerAddress: string;
  providerName: string;
}

export default function ProviderPageClient({ providerAddress, providerName }: ProviderPageClientProps) {
  const { address } = useWallet();

  return (
    <FollowButton 
      providerAddress={providerAddress} 
      providerName={providerName}
      userAddress={address || undefined}
      className="flex-shrink-0"
    />
  );
}