// lib/api.ts
import axios from "axios";
import { getBackendUrl } from "./config";

export const api = axios.create({
  baseURL: getBackendUrl(),
});
