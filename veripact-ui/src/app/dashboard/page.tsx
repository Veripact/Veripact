// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NicheSelector from "@/components/NicheSelector";
import FileUploader from "@/components/FileUploader";
import StarRating from "@/components/StarRating";
import VerificationResult from "@/components/VerificationResult";
import { api } from "@/lib/api";
import { useWeb3AuthUser, useWeb3AuthConnect } from "@web3auth/modal/react";

interface DocumentData {
  VendorName?: string;
  TransactionID?: string;
  TotalAmount?: number;
  Date?: string;
}

interface ConsistencyData {
  VendorName?: boolean;
  TransactionID?: boolean;
  TotalAmount?: boolean;
  Date?: boolean;
}

interface Discrepancy {
  field: string;
  invoice: string;
  receipt: string;
}

interface ApiResponse {
  success: boolean;
  linkUuid: string;
  validationUrl: string;
  data: {
    analysis: {
      invoice?: DocumentData;
      receipt?: DocumentData;
      consistency?: ConsistencyData;
      discrepancies?: Discrepancy[];
      overall_match: boolean;
    };
  };
}

interface VerificationResultData {
  transactionId: string;
  amount: number;
  date?: string;
  vendorName?: string;
  overall_match: boolean;
  validationUrl: string;
  consistency?: ConsistencyData;
  discrepancies?: Discrepancy[];
}


export default function DashboardPage() {
  const [niche, setNiche] = useState("General");
  const [invoiceFile, setInvoiceFile] = useState<File[]>([]);
  const [receiptFile, setReceiptFile] = useState<File[]>([]);
  const [sellerRating, setSellerRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const { userInfo, loading: authLoading } = useWeb3AuthUser();
  const { isConnected } = useWeb3AuthConnect();

  // Debug: log userInfo and wallet address after login
  React.useEffect(() => {
    if (userInfo) {
      const wallets = (userInfo as { wallets?: { address?: string; public_key?: string }[] })?.wallets;
      if (wallets && wallets.length > 0) {
        console.log('Wallet address:', wallets[0].address || wallets[0].public_key);
      } else {
        console.log('No wallet found in userInfo.');
      }
    }
  }, [userInfo]);

  // Protect route with Web3Auth only
  useEffect(() => {
    if (!authLoading && !isConnected) {
      router.replace("/auth");
    }
  }, [authLoading, isConnected, router]);

  if (authLoading) {
    return <p className="p-10 text-center">Checking authentication…</p>;
  }

  const handleSubmit = async () => {
    // Must be signed in with Web3Auth
    if (!userInfo) {
      setError("You must be signed in to submit.");
      return;
    }
    if (invoiceFile.length !== 1 || receiptFile.length !== 1) {
      setError("Please upload exactly one invoice and one receipt.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("niche", niche);
      form.append("user_id", userInfo.email  || userInfo.userId || "");
      form.append("rating_by_seller", String(sellerRating));
      form.append("documents", invoiceFile[0]);
      form.append("documents", receiptFile[0]);

      // Add Web3Auth JWT to Authorization header if available
      const token = userInfo.idToken || userInfo.oAuthIdToken || userInfo.oAuthAccessToken || "";
      if (!token) throw new Error("No access token found. Please log in.");
      const res = await api.post("/verify-transaction", form, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      });
      // ...existing response handling...
      const response = res.data as ApiResponse;
      const analysis = response.data?.analysis;
      if (!analysis) throw new Error('Invalid response format from server');
      const transactionId = analysis.receipt?.TransactionID || analysis.invoice?.TransactionID;
      const amount = analysis.receipt?.TotalAmount || analysis.invoice?.TotalAmount;
      const date = analysis.receipt?.Date || analysis.invoice?.Date;
      const vendorName = analysis.receipt?.VendorName || analysis.invoice?.VendorName;
      if (!transactionId || amount == null) throw new Error('Missing required transaction details in the response');
      setResult({
        transactionId,
        amount,
        date,
        vendorName,
        overall_match: analysis.overall_match,
        consistency: analysis.consistency,
        discrepancies: analysis.discrepancies,
        validationUrl: response.validationUrl,
      });
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: string } }; message?: string };
      setError(
        error.response?.data?.error || 
        error.message || 
        "Something went wrong – please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-lg mx-auto space-y-6 py-10">
        <h1 className="text-2xl font-bold">Initiate Transaction Verification</h1>
        <NicheSelector value={niche} onChange={setNiche} />
        <br />
        <div className="flex flex-col items-center">
          <div className="w-full flex flex-col items-center">
            <h3 className="font-medium mb-2">Your rating for the client</h3>
            <StarRating value={sellerRating} onChange={setSellerRating} />
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">Upload Invoice</h3>
          <FileUploader files={invoiceFile} onFilesChange={setInvoiceFile} maxFiles={1} />
        </div>
        <div>
          <h3 className="font-medium mb-2">Upload Receipt</h3>
          <FileUploader files={receiptFile} onFilesChange={setReceiptFile} maxFiles={1} />
        </div>
        {/* <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit"}
        </button> */}
        {error && <p className="text-red-600">{error}</p>}
        {!result && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        )}
        {result && <VerificationResult result={result} />}
      </div>

      {result && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => {
              setResult(null);
              setInvoiceFile([]);
              setReceiptFile([]);
              setNiche("General");
              setSellerRating(5);
              setError("");
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Initiate Another Transaction Verification
          </button>
        </div>
      )}
    </>
  );
}
