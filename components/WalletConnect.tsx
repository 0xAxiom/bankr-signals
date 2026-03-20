"use client";

import { useWallet } from './WalletContext';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

interface WalletConnectProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export default function WalletConnect({ 
  size = 'sm', 
  variant = 'outline', 
  className = '' 
}: WalletConnectProps) {
  const { address, isConnected, isLoading, error, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-[#737373] font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button
          variant="ghost"
          size={size}
          onClick={disconnect}
          className="text-[#737373] hover:text-[#e5e5e5]"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        onClick={connect}
        disabled={isLoading}
      >
        <Wallet className="h-4 w-4 mr-1" />
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {error && (
        <p className="text-xs text-red-500 mt-1 max-w-xs">{error}</p>
      )}
    </div>
  );
}