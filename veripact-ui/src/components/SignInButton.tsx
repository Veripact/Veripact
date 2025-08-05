"use client";

import React from "react";
import { useWeb3AuthConnect } from "@web3auth/modal/react";

import { WalletServicesPlugin } from '@web3auth/wallet-services-plugin';

const SignInButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { connect, loading } = useWeb3AuthConnect();

  const handleSignIn = async () => {
    await connect();
    // Show embedded wallet UI after login
    try {
      const walletServicesPlugin = new WalletServicesPlugin();
      await walletServicesPlugin.showWalletUi({ show: true });
    } catch (err) {
      console.error('Failed to show embedded wallet UI:', err);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className={`w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg font-medium transition-colors ${className}`}
      disabled={loading}
    >
      {loading ? "Signing in…" : "Sign in with Web3Auth"}
    </button>
  );
};

export default SignInButton;
