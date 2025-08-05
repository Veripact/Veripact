'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3AuthDisconnect, useWeb3AuthConnect } from '@web3auth/modal/react';

type LogoutButtonProps = {
  className?: string;
};

/**
 * A logout button that uses Web3Auth for authentication.
 * On click, it calls Web3Auth's logout and then redirects to /auth.
 */
const LogoutButton: React.FC<LogoutButtonProps> = ({ className = '' }) => {
  const router = useRouter();

  const { disconnect, loading, error } = useWeb3AuthDisconnect();
  const { isConnected } = useWeb3AuthConnect();

  const handleLogout = async () => {
    console.log('Logging out...');
    if (!isConnected) {
      console.warn('Web3Auth is not connected, cannot log out.');
      return;
    }
    await disconnect();
    router.replace('/auth');
  };

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors ${className}`}
    >
      Sign Out
    </button>
  );
};

export default LogoutButton;