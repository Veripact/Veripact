// lib/api.ts
import axios from "axios";
import { supabase } from "./supabaseClient";
import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";

// Use production backend URL if in production, otherwise use local
const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://ai-agent-backend-15k93fwu7-the-squids-projects.vercel.app';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

export const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1. Grab Supabase session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error("Supabase session error:", error);
      return config;
    }
    const token = session?.access_token;
    if (!token) {
      return config;
    }

    // 2. Ensure headers is the right internal type
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }

    // 3. Mutate (don't overwrite) so we keep the internal methods
    config.headers["Authorization"] = `Bearer ${token}`;

    return config;
  },
  (err) => Promise.reject(err)
);
