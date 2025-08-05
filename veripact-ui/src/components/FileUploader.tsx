// src/components/FileUploader.tsx
"use client";

import { useState } from "react";

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function FileUploader({
  files,
  onFilesChange,
  maxFiles = 2,
}: FileUploaderProps) {
  const [warning, setWarning] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > maxFiles) {
      setWarning(`You can only upload up to ${maxFiles} file${maxFiles > 1 ? "s" : ""}.`);
      selected.splice(maxFiles);
    } else {
      setWarning("");
    }
    onFilesChange(selected);
    e.target.value = ""; // reset input so same file can be re-picked if removed
  };

  return (
    <div className="relative border-dashed border-2 border-gray-300 p-6 text-center">
      <input
        type="file"
        multiple
        accept=".pdf,.png,.jpg"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {files.length === 0 && <p>Drag &amp; drop or click to select file{maxFiles>1?"s":""}</p>}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      )}

      {warning && <p className="mt-2 text-sm text-red-600">{warning}</p>}
    </div>
  );
}
