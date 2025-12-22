// lib/api.ts
// Centralized API configuration

// Default to localhost:8000, but allow override via environment variable
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:8080";

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
};
