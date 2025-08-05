// lib/config.ts
/**
 * Get the backend API URL consistently across the application
 * This ensures all API calls use the same logic as the axios instance
 */
export const getBackendUrl = (): string => {
  // In production (not localhost), use the production backend URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://ai-agent-backend-tau.vercel.app';
  }
  
  // In development, use environment variable or fallback to localhost
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
};
