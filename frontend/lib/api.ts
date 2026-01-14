// lib/api.ts
// Centralized API configuration

// Use empty string for relative URLs (works with reverse proxy)
// Or set NEXT_PUBLIC_API_BASE_URL for direct backend access
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

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

  // Auth endpoints
  login: `${API_BASE_URL}/api/v1/auth/jwt/login`,
  register: `${API_BASE_URL}/api/v1/auth/register`,
  me: `${API_BASE_URL}/api/v1/users/me`,

  // Documents endpoint
  documents: `${API_BASE_URL}/api/v1/documents`,

  // Progress endpoints
  progressRecord: `${API_BASE_URL}/api/v1/progress/record`,
  progressStats: `${API_BASE_URL}/api/v1/progress/stats`,
  progressDocument: (documentId: number) =>
    `${API_BASE_URL}/api/v1/progress/document/${documentId}`,
  progressQuestion: (questionId: number) =>
    `${API_BASE_URL}/api/v1/progress/question/${questionId}`,

  // Flashcards endpoints (TODO: implement backend)
  generateFlashcards: (filename: string) =>
    `${API_BASE_URL}/api/v1/generate-flashcards/${encodeURIComponent(filename)}`,
};
