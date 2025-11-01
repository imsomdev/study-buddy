// lib/api.ts
// Centralized API configuration

// Default to localhost:8000, but allow override via environment variable
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8000";

// API endpoints
export const API_ENDPOINTS = {
  uploadFile: `${API_BASE_URL}/api/v1/uploadfile/`,
  generateMcq: `${API_BASE_URL}/api/v1/generate-mcq/`,
  mcqQuestionCount: (filename: string) =>
    `${API_BASE_URL}/api/v1/mcq-question-count/${encodeURIComponent(filename)}`,
  mcqQuestions: (filename: string, questionIndex: number) =>
    `${API_BASE_URL}/api/v1/mcq-questions/${encodeURIComponent(
      filename
    )}/${questionIndex}`,
  validateAnswer: `${API_BASE_URL}/api/v1/validate-answer/`,
  auth: {
    login: `${API_BASE_URL}/api/v1/auth/login`,
    signup: `${API_BASE_URL}/api/v1/auth/signup`,
    me: `${API_BASE_URL}/api/v1/auth/me`,
    passwordResetRequest: `${API_BASE_URL}/api/v1/auth/password-reset/request`,
    passwordResetConfirm: `${API_BASE_URL}/api/v1/auth/password-reset/confirm`,
    changePassword: `${API_BASE_URL}/api/v1/auth/password/change`,
  },
};

// Helper function to get auth headers
export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Helper function for authenticated fetch
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (typeof window === "undefined") {
    return fetch(url, options);
  }

  const token = localStorage.getItem("auth_token");

  const headers: HeadersInit = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
