"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import SignInButton from "@/components/SignInButton";

export default function AuthPage() {
  const router = useRouter();
  const { connect, isConnected, loading, error } = useWeb3AuthConnect();

  useEffect(() => {
    if (isConnected) {
      router.replace("/dashboard");
    }
  }, [isConnected, router]);

  if (loading) {
    return <p className="p-10 text-center">Loading authentication…</p>;
  }

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl mb-4 text-center font-bold">Sign In</h1>
      <p className="text-center text-gray-600 mb-6">
        Access your Veripact account securely with Web3Auth.
      </p>
      <SignInButton />
    </div>
  );
}