"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWeb3AuthUser, useWeb3AuthConnect } from "@web3auth/modal/react";
import LogoutButton from '@/components/LogoutButton';

export default function ProfilePage() {
  const router = useRouter();
  const { userInfo, loading, error } = useWeb3AuthUser();
  const { isConnected } = useWeb3AuthConnect();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isConnected) {
      router.replace("/auth");
    }
  }, [loading, isConnected, router]);

  if (loading) {
    return <p className="p-10 text-center">Checking authentication…</p>;
  }

  return (
    <div className="max-w-lg mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <p>
        Logged in as <strong>{userInfo?.email ?? userInfo?.name ?? "—"}</strong>
      </p>
      <LogoutButton/>
      {/* TODO: fetch & display this user’s verifications, badges, etc. */}
      {error && <p className="text-red-600 mt-4">{error.message}</p>}
    </div>
  );
}