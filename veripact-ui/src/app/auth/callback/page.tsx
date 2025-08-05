"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWeb3AuthConnect } from "@web3auth/modal/react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isConnected, loading } = useWeb3AuthConnect();

  useEffect(() => {
    if (loading) return;
    if (isConnected) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth?error=invalid_or_expired_link");
    }
  }, [isConnected, loading, router]);

  return <p className="p-10 text-center">Signing you in…</p>;
}

