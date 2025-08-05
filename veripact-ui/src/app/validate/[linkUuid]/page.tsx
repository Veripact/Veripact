// src/app/validate/[linkUuid]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWeb3Auth } from "@web3auth/modal/react";
import StarRating from "@/components/StarRating"; // Import the StarRating component
import { getBackendUrl } from "@/lib/config";
import Image from "next/image";

// Updated the Verification type to match the actual property name in the data object
type Verification = {
    images: string[]; // Deprecated, replaced by image_urls
    image_urls: string[]; // New property for image URLs
    ai_result: {
        analysis?: {
            overall_match?: string;
            consistency?: {
                Date?: boolean;
                VendorName?: boolean;
                TotalAmount?: boolean;
                TransactionID?: boolean;
            };
            discrepancies?: Array<{ field: string; invoice: string; receipt: string }>;
            invoice?: {
                Date?: string;
                VendorName?: string;
                TotalAmount?: string;
                TransactionID?: string;
            };
            receipt?: {
                Date?: string;
                VendorName?: string;
                TotalAmount?: string;
                TransactionID?: string;
            };
        };
    }; // Updated from aiResult to ai_result
    sellerRating: number;
    rating_by_client: number | null;
    status: "pending" | "approved" | "rejected";
    on_chain_tx_hash: string | null;
};

export default function ValidatePage() {
    const { linkUuid } = useParams();

    const {
        web3Auth,
        isConnected,
        isInitializing,
        provider,
        status,
        initError
    } = useWeb3Auth();

    // Main page component for validating a transaction
    const router = useRouter();

    // State for verification data, client rating, loading, error, and wallet
    const [data, setData] = useState<Verification | null>(null);
    const [clientRating, setClientRating] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [account, setAccount] = useState("");

    useEffect(() => {
        if (isConnected && provider) {
            // Fixed type mismatch in provider.request by explicitly casting the response to string[]
            provider.request({ method: "eth_accounts" }).then((accounts) => {
                setAccount((accounts as string[])[0] || "");
            });
        }
    }, [isConnected, provider]);

    // Fetch verification data from backend when authenticated and not loading
    useEffect(() => {
        if (!isConnected || !account) return;
        const backendUrl = getBackendUrl();
        fetch(`${backendUrl}/validate/${linkUuid}`)
            .then(res => res.json())
            .then(json => setData(json.verification))
            .catch((err) => {
                console.error('Failed to load data:', err);
                setError("Failed to load data");
            });
    }, [linkUuid, isConnected, account]);

    // Login handler
    const login = async () => {
        try {
            if (web3Auth) {
                await web3Auth.connect();
                console.log("Web3Auth instance after login:", web3Auth);
            }
        } catch (err) {
            setError("Login failed");
            console.error("Login error:", err);
        }
    };

    // Submit client rating to backend
    const handleValidationSubmission = async (action: 'validate' | 'reject') => {
        if (action === 'validate' && (clientRating < 1 || clientRating > 5)) {
            setError("Please select 1–5 stars.");
            return;
        }
        if (!account || !web3Auth) {
            setError("Please log in to continue.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            // Get authentication token (Web3Auth v10)
            let idToken = "";
            // Ensure authenticateUser is called correctly and idToken is retrieved
            if (web3Auth) {
                console.log("Web3Auth status before authenticateUser:", {
                    isConnected,
                    status,
                    initError,
                });
                if (typeof (web3Auth as unknown as { authenticateUser?: () => Promise<{ idToken: string }> }).authenticateUser === "function") {
                    try {
                        const authRes = await (web3Auth as unknown as { authenticateUser: () => Promise<{ idToken: string }> }).authenticateUser();
                        console.log("authenticateUser result:", authRes); // Debug: Log the result of authenticateUser
                        idToken = authRes.idToken;
                    } catch (authError) {
                        console.error("Authentication error:", authError);
                        setError("Failed to retrieve access token. Please try logging in again.");
                        setLoading(false);
                        return;
                    }
                } else {
                    console.warn("authenticateUser method not available on Web3Auth instance.");
                    // Fallback to getUserInfo if authenticateUser is unavailable
                    if (typeof (web3Auth as unknown as { getUserInfo?: () => Promise<{ idToken?: string; oAuthIdToken?: string; oAuthAccessToken?: string }> }).getUserInfo === "function") {
                        try {
                            const userInfo = await (web3Auth as unknown as { getUserInfo: () => Promise<{ idToken?: string; oAuthIdToken?: string; oAuthAccessToken?: string }> }).getUserInfo();
                            console.log("getUserInfo result:", userInfo); // Debug: Log the result of getUserInfo
                            idToken = userInfo.idToken || userInfo.oAuthIdToken || userInfo.oAuthAccessToken || "";
                        } catch (userInfoError) {
                            console.error("getUserInfo error:", userInfoError);
                            setError("Failed to retrieve user information. Please try logging in again.");
                            setLoading(false);
                            return;
                        }
                    } else {
                        console.warn("getUserInfo method not available on Web3Auth instance.");
                    }
                }
            } else {
                console.error("Web3Auth instance is not initialized.");
            }
            if (!idToken) {
                setError("No access token found. Please log in.");
                setLoading(false);
                router.replace("/auth"); // Redirect to login page
                return;
            }
            console.log("Access Token:", idToken); // Debug: Log the access token
            // POST rating to the new backend route
            const body = action === 'reject' ? { decision: 'reject' } : { rating_by_client: clientRating };
            const submitUrl = getBackendUrl();
            const res = await fetch(`${submitUrl}/submit_validation/${linkUuid}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify(body),
            });

            // Debug: Log response status and text
            console.log("Response status:", res.status);
            const responseJson = await res.json();
            console.log("Response JSON:", responseJson);

            if (!responseJson.success) {
                throw new Error(responseJson.error || "Failed to submit validation.");
            }

            // Update the UI state if submission is successful
            setData((prevData) => {
                if (!prevData) return null; // Ensure previous data exists
                return {
                    ...prevData,
                    rating_by_client: action === 'reject' ? 1 : clientRating,
                    status: action === 'reject' ? "rejected" : "approved",
                };
            });

            // Refetch updated data from the backend after successful submission
            const refetchUrl = getBackendUrl();
            const updatedData = await fetch(`${refetchUrl}/validate/${linkUuid}`)
                .then(res => res.json())
                .then(json => json.verification);
            setData(updatedData);
        } catch (e: unknown) {
            const error = e as { message?: string };
            setError(error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Show loading message while checking authentication
    if (isInitializing) {
        return <p className="p-10 text-center">Checking authentication…</p>;
    }
    // If not logged in, prompt user to log in
    if (!isConnected) {
        return (
            <div className="p-10 text-center">
                <p className="mb-4">Please log in to validate this transaction.</p>
                <div className="w-full max-w-md mx-auto">
                    <button onClick={login} className="px-4 py-2 bg-blue-600 text-white rounded">Login with Web3Auth</button>
                </div>
            </div>
        );
    }
    // Show data loading or submission error
    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-red-600 text-center text-lg font-semibold">{error}</p>
            </div>
        );
    }
    // Show loading message while fetching verification data
    if (!data) {
        return <p>Loading…</p>;
    }

    // Debug: Log AI result and full data object
    console.log('AI Result:', data.ai_result);
    console.log('Full Data Object:', data);
    {/* Debug: Log the on_chain_tx_hash value */}
    console.log("On-chain transaction hash:", data.on_chain_tx_hash);

    // If transaction already validated, show status and rating
    if (data.status !== "pending") {
        console.log('Transaction already validated:', data.status);
        return (
            <div className="max-w-lg mx-auto space-y-6 py-10">
                <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">Transaction {data.status.toUpperCase()}</h1>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4 flex flex-col items-center justify-center">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">Your Rating For The Service Provider</h3>
                    <StarRating value={data.rating_by_client || 0} onChange={() => {}} max={5} mutable={false} />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 flex flex-col items-center justify-center">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">On-Chain Confirmation</h3>
                    <p className="mb-2">
                        <button
                            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${data.on_chain_tx_hash}`, '_blank', 'noopener,noreferrer')}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            View on Etherscan
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    // If transaction is pending, allow client to submit rating
    console.log('Transaction pending, ready for client rating');
    
    return (
        <div className="max-w-lg mx-auto space-y-6 py-10">
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">Validate Transaction</h1>
         
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 text-center">Transaction Details</h2>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Invoice Details</h3>
                    <p><strong>Date:</strong> {data.ai_result.analysis?.invoice?.Date || "N/A"}</p>
                    <p><strong>Vendor Name:</strong> {data.ai_result.analysis?.invoice?.VendorName || "N/A"}</p>
                    <p><strong>Total Amount:</strong> {data.ai_result.analysis?.invoice?.TotalAmount || "N/A"}</p>
                    <p><strong>Transaction ID:</strong> {data.ai_result.analysis?.invoice?.TransactionID || "N/A"}</p>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Receipt Details</h3>
                    <p><strong>Date:</strong> {data.ai_result.analysis?.receipt?.Date || "N/A"}</p>
                    <p><strong>Vendor Name:</strong> {data.ai_result.analysis?.receipt?.VendorName || "N/A"}</p>
                    <p><strong>Total Amount:</strong> {data.ai_result.analysis?.receipt?.TotalAmount || "N/A"}</p>
                    <p><strong>Transaction ID:</strong> {data.ai_result.analysis?.receipt?.TransactionID || "N/A"}</p>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Consistency Check</h3>
                    <p><strong>Date Match:</strong> {data.ai_result.analysis?.consistency?.Date ? "Yes" : "No"}</p>
                    <p><strong>Vendor Name Match:</strong> {data.ai_result.analysis?.consistency?.VendorName ? "Yes" : "No"}</p>
                    <p><strong>Total Amount Match:</strong> {data.ai_result.analysis?.consistency?.TotalAmount ? "Yes" : "No"}</p>
                    <p><strong>Transaction ID Match:</strong> {data.ai_result.analysis?.consistency?.TransactionID ? "Yes" : "No"}</p>
                </div>

                {(data.ai_result.analysis?.discrepancies?.length ?? 0) > 0 && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Discrepancies</h3>
                        <ul className="list-disc pl-5">
                            {data.ai_result.analysis?.discrepancies?.map((discrepancy, index: number) => (
                                <li key={index}>
                                    <strong>{discrepancy.field}:</strong> Invoice shows &quot;{discrepancy.invoice}&quot;, Receipt shows &quot;{discrepancy.receipt}&quot;
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">Supporting Documents</h3>
                    <div className="flex justify-center">
                        <div className="grid grid-cols-3 gap-4">
                            {Array.isArray(data.image_urls) && data.image_urls.map((url: string, index: number) => (
                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                    <Image
                                        src={url}
                                        alt={`Document ${index + 1}`}
                                        width={96}
                                        height={96}
                                        className="w-full h-24 object-cover rounded shadow-md hover:shadow-lg transition-shadow duration-200"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                

                {/* Check if on_chain_tx_hash is valid before rendering the button */}
                {/* {!data.on_chain_tx_hash ? (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 flex flex-col items-center justify-center">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">On-Chain Confirmation</h3>
                        <p className="text-red-600 text-center">Transaction hash is missing or invalid.</p>
                    </div>
                ) : (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">On-Chain Transaction</h3>
                        <p>
                            <button
                                onClick={() => window.open(`https://sepolia.etherscan.io/tx/${data.on_chain_tx_hash}`, '_blank', 'noopener,noreferrer')}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                                View on Etherscan
                            </button>
                        </p>
                    </div>
                )} */}
            </div>

            <div className="w-full flex flex-col items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 text-center">Your Rating For The Service Provider</h2>
                {/* StarRating component for client to select rating */}
                <StarRating
                    value={clientRating}
                    onChange={(value: number) => {
                        console.log('Client rating changed:', value);
                        setClientRating(value);
                    }}
                />
            </div>

            {/* Button to submit rating */}
            <button
                onClick={() => handleValidationSubmission('validate')}
                disabled={loading || clientRating === 0}
                className={`w-full py-2 px-4 rounded-lg text-white ${loading || clientRating === 0 ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-400 hover:bg-blue-700 dark:hover:bg-blue-500'}`}
            >
                {loading ? "Verifying Transaction…" : "Confirm"}
            </button>
            <button
                onClick={() => handleValidationSubmission('reject')}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg text-white mt-2 ${loading ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-red-600 dark:bg-red-400 hover:bg-red-700 dark:hover:bg-red-500'}`}
            >
                Reject
            </button>
        </div>
    );
}
