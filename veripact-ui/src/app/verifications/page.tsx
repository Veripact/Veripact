"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { api } from '@/lib/api';

export default function VerificationsPage() {
  const router = useRouter();
  // Web3Auth modal/react hooks
  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { address, connector } = useAccount();
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!connectLoading && !isConnected) {
      router.replace("/auth");
    }
  }, [connectLoading, isConnected, router]);

  useEffect(() => {
    const fetchVerifications = async () => {
      if (!userInfo?.userId) return;
      setLoading(true);
      setError("");
      try {
        // Assumes backend route: /verifications?user_id=...
        const res = await api.get(`/verifications?user_id=${userInfo.userId}`);
        setVerifications(res.data.verifications || []);
      } catch (e: any) {
        setError(e.response?.data?.error || e.message || "Failed to load verifications");
      } finally {
        setLoading(false);
      }
    };
    if (!connectLoading && isConnected && userInfo?.userId) {
      fetchVerifications();
    }
  }, [connectLoading, isConnected, userInfo]);

  if (connectLoading) {
    return <p className="p-10 text-center">Checking authentication…</p>;
  }

  if (!isConnected) {
    // Unlogged-in view
    return (
      <div className="max-w-lg mx-auto py-10 space-y-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign in to view your verifications</h1>
        <div className="flex flex-col items-center space-y-4">
          <button onClick={() => connect()} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded transition-colors">Login</button>
          {connectLoading && <p className="text-gray-500">Connecting...</p>}
          {connectError && <p className="text-red-600">{connectError.message}</p>}
        </div>
      </div>
    );
  }

  // Logged-in view
  return (
    <div className="max-w-lg mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Your Verifications</h1>
      {loading && <p>Loading verifications…</p>}
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-2">
        {verifications.length === 0 && !loading && <p>No verifications found.</p>}
        {verifications.map((v) => {
          // Ensure userInfo is not null before accessing its properties
          const otherParty = userInfo && v.seller_id === userInfo.userId && v.client_id === userInfo.userId
    ? "Self"
    : userInfo && v.seller_id !== userInfo.userId
    ? v.seller_id
    : v.client_id;

          return (
            <div key={v.link_uuid} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 dark:bg-gray-800">
              <div>
                  
                <div className="font-medium">Other party: <span className="text-blue-700 dark:text-blue-300">{otherParty || "—"}</span></div>
                <div className={`text-sm text-gray-600 dark:text-gray-400`}>
                  Status: <span className={`${v.status === 'approved' ? 'text-green-600 dark:text-green-400' : v.status === 'rejected' ? 'text-red-600 dark:text-red-400' : ''}`}>{v.status}</span>
                </div>
              </div>
              {v.created_at && (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 space-y-1 mr-4">
                    <div>Date: {new Date(v.created_at).toLocaleDateString()}</div>
                    <div>Time: {new Date(v.created_at).toLocaleTimeString()}</div>
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/validate/${v.link_uuid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Open Link
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
