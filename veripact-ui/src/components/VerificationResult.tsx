// src/components/VerificationResult.tsx
"use client";

interface Discrepancy {
  field: string;
  invoice: string;
  receipt: string;
}

interface ConsistencyData {
  VendorName?: boolean;
  TransactionID?: boolean;
  TotalAmount?: boolean;
  Date?: boolean;
}

interface VerificationResultProps {
  result: {
    transactionId: string;
    amount: number;
    date?: string;
    vendorName?: string;
    overall_match: boolean;
    validationUrl: string;
    consistency?: ConsistencyData;
    discrepancies?: Discrepancy[];
  };
}

export default function VerificationResult({ result }: VerificationResultProps) {
  const { 
    transactionId, 
    amount, 
    date, 
    vendorName,
    validationUrl,
    consistency,
    discrepancies 
  } = result;

  return (
    <div className="mt-6 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden dark:bg-gray-800">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verification Result</h3>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <div className="space-y-2 text-gray-900 dark:text-gray-100">
          {vendorName && (
            <p>
              <span className="font-medium">Vendor:</span>{" "}
              <span className={consistency?.VendorName ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {vendorName}
              </span>
            </p>
          )}
          <p>
            <span className="font-medium">Transaction ID:</span>{" "}
            <span className={consistency?.TransactionID ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {transactionId}
            </span>
          </p>
          <p>
            <span className="font-medium">Amount:</span>{" "}
            <span className={consistency?.TotalAmount ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              ${amount}
            </span>
          </p>
          {date && (
            <p>
              <span className="font-medium">Date:</span>{" "}
              <span className={consistency?.Date ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {date}
              </span>
            </p>
          )}
        </div>

        {discrepancies && discrepancies.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Discrepancies Found:</h4>
            <ul className="space-y-2 text-sm">
              {discrepancies.map((d, i) => (
                <li key={i} className="text-red-600 dark:text-red-400">
                  {d.field}: Invoice shows &quot;{d.invoice}&quot;, Receipt shows &quot;{d.receipt}&quot;
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Share this link with your client for validation:
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              readOnly
              value={validationUrl}
              className="p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm"
            />
            <button
              onClick={() => {
          navigator.clipboard.writeText(validationUrl);
          const button = document.activeElement as HTMLButtonElement;
          const originalText = button.innerText;
          button.innerText = "Copied!";
          setTimeout(() => {
            button.innerText = originalText;
          }, 2000);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded border border-blue-600 dark:border-blue-700 text-sm font-medium transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
