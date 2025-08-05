"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  mutable?: boolean; // New parameter to control mutability
}

export default function StarRating({ value, onChange, max = 5, mutable = true }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex space-x-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => mutable && onChange(star)} // Only allow onClick if mutable
          onMouseEnter={() => mutable && setHover(star)} // Only allow hover effect if mutable
          onMouseLeave={() => mutable && setHover(0)} // Only allow hover effect if mutable
          className="text-2xl focus:outline-none"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <span className={(hover || value) >= star ? "text-yellow-400" : "text-gray-300"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
