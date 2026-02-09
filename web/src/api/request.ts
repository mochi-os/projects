// Projects app request helpers
// Uses getAppPath() + '/' as baseURL

import axios, { type AxiosRequestConfig } from "axios";
import { getAppPath, getCookie, useAuthStore } from "@mochi/common";

// Create a projects-specific axios instance that uses app path as baseURL
const projectsClient = axios.create({
  timeout: 30000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

projectsClient.interceptors.request.use((config) => {
  // Always use app path as baseURL (class context)
  config.baseURL = getAppPath() + "/";

  // Remove Content-Type for FormData so axios can set the multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  // Add auth token
  const storeToken = useAuthStore.getState().token;
  const cookieToken = getCookie("token");
  const token = storeToken || cookieToken;

  if (token) {
    config.headers.Authorization = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  return config;
});

export const projectsRequest = {
  get: async <TResponse>(
    url: string,
    config?: Omit<AxiosRequestConfig, "url" | "method">,
  ): Promise<TResponse> => {
    const response = await projectsClient.get<TResponse>(url, config);
    return response.data;
  },

  post: async <TResponse, TBody = unknown>(
    url: string,
    data?: TBody,
    config?: Omit<AxiosRequestConfig<TBody>, "url" | "method" | "data">,
  ): Promise<TResponse> => {
    const response = await projectsClient.post<TResponse>(url, data, config);
    return response.data;
  },
};

export default projectsRequest;
