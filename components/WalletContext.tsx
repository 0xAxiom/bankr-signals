"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          });
          if (accounts[0]) {
            setAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setError(null);
        } else {
          setAddress(null);
        }
      });
    }
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts[0]) {
        setAddress(accounts[0]);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setError(null);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isLoading,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

const defaultWalletContext: WalletContextType = {
  address: null,
  isConnected: false,
  isLoading: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
};

export function useWallet() {
  const context = useContext(WalletContext);
  // Return safe defaults during SSR or if used outside provider
  return context ?? defaultWalletContext;
}

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}