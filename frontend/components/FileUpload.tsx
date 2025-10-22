"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, API_ENDPOINTS } from "../lib/api";

type FileType = "pdf" | "docx" | "txt" | null;

// Define the question type based on the schema
type Choice = {
  id: string;
  text: string;
};

type Question = {
  id: number;
  question: string;
  choices: Choice[];
  correct_answer: string;
  explanation?: string;
};

type MCQGenerationResponse = {
  filename: string;
  page_count: number;
  questions: Question[];
  message: string;
};

const FileUpload = () => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileType, setFileType] = useState<FileType>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const validateFile = (file: File): boolean => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const validExtensions = [".pdf", ".docx", ".txt"];

    const fileTypeValid = validTypes.includes(file.type);
    const fileExtensionValid = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    return fileTypeValid || fileExtensionValid;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];

      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        detectFileType(droppedFile);
      } else {
        setNotification({
          type: "error",
          message: "Please upload a PDF, DOCX, or TXT file.",
        });
      }
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        detectFileType(selectedFile);
      } else {
        setNotification({
          type: "error",
          message: "Please upload a PDF, DOCX, or TXT file.",
        });
      }
    }
  };

  const detectFileType = (file: File) => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf")) {
      setFileType("pdf");
    } else if (fileName.endsWith(".docx")) {
      setFileType("docx");
    } else if (fileName.endsWith(".txt")) {
      setFileType("txt");
    } else {
      setFileType(null);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetUpload = () => {
    setFile(null);
    setFileType(null);
    setIsUploading(false);
    setUploadProgress(0);
    setIsUploadComplete(false);
    setIsGeneratingQuestions(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleActualUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95; // Keep at 95% until actual upload completes
        }
        return prev + 5;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_ENDPOINTS.uploadFile, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);
        setNotification({
          type: "success",
          message: `${file.name} uploaded successfully!`,
        });

        // Set upload complete to show the post-upload screen
        setTimeout(() => {
          setIsUploading(false);
          setIsUploadComplete(true);
        }, 500);
      } else {
        const errorData = await response.json();
        console.error("Upload failed:", errorData);
        setNotification({
          type: "error",
          message: `Upload failed: ${errorData.detail || "Unknown error"}`,
        });
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Upload error:", error);
      clearInterval(progressInterval);
      setNotification({
        type: "error",
        message: `Upload failed with error: ${error.message}`,
      });
      setIsUploading(false);
    }
  };

  const handleViewFile = () => {
    if (file) {
      // Create a temporary URL for the file and open it
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    }
  };

  const handleStartJourney = async () => {
    if (!file) return;

    setIsGeneratingQuestions(true);

    try {
      // Upload the file to get its URL for question generation
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(API_ENDPOINTS.uploadFile, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();

      // Now generate questions using the file URL
      const generateResponse = await fetch(API_ENDPOINTS.generateMcq, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_url: uploadResult.file_url,
          num_questions: 5, // Default number of questions per page
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.detail || "Question generation failed");
      }

      const result: MCQGenerationResponse = await generateResponse.json();
      console.log("Questions generated:", result);

      // Clear any existing session storage from previous attempts
      sessionStorage.removeItem("currentQuestionIndex");
      sessionStorage.removeItem("selectedChoice");
      sessionStorage.removeItem("isAnswerSubmitted");
      sessionStorage.removeItem("isCorrect");
      sessionStorage.removeItem("validationResult");

      // Store the questions in sessionStorage and navigate to the questions page
      sessionStorage.setItem("generatedQuestions", JSON.stringify(result));
      setNotification({
        type: "success",
        message: `Questions generated successfully from ${result.page_count} pages!`,
      });

      // Navigate to the questions page
      router.push("/questions");
    } catch (error) {
      console.error("Question generation error:", error);
      setNotification({
        type: "error",
        message: `Failed to generate questions: ${error.message}`,
      });
      setIsGeneratingQuestions(false);
    }
  };

  // Function to close the notification
  const closeNotification = () => {
    setNotification(null);
  };

  // Auto-close notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-white max-w-sm ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span>{notification.message}</span>
            <button
              onClick={closeNotification}
              className="ml-4 text-white focus:outline-none"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        {!file && !isUploadComplete ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-300 hover:border-indigo-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onClick={handleUploadClick}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag & drop your files here
              </p>
              <p className="text-gray-500 mb-4">or click to browse</p>
              <button
                type="button"
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse Files
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Supports PDF, DOCX, and TXT files
              </p>
              <p className="mt-2 text-sm text-gray-600 italic">
                Upload here to generate questions and study materials
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            />
          </div>
        ) : isUploading ? (
          // Upload animation component
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 animate-ping"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>
                </div>
              </div>

              <p className="text-xl font-medium text-gray-800 mb-2">
                Uploading {file.name}
              </p>
              <p className="text-gray-600 mb-6">
                Please wait while we process your file...
              </p>

              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{uploadProgress}%</p>
            </div>
          </div>
        ) : isGeneratingQuestions ? (
          // Question generation animation
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 animate-ping"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    ></path>
                  </svg>
                </div>
              </div>

              <p className="text-xl font-medium text-gray-800 mb-2">
                Generating Questions
              </p>
              <p className="text-gray-600 mb-6">
                Please wait while we create study materials for you...
              </p>

              <div className="w-16 h-16 border-t-4 border-indigo-600 border-solid rounded-full animate-spin"></div>
            </div>
          </div>
        ) : isUploadComplete ? (
          // Post upload screen
          <div className="border rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-cyan-50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Upload Successful!
              </h2>
              <p className="text-gray-600">
                Your file has been processed successfully
              </p>
            </div>

            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 mb-4">
                What would you like to do next with{" "}
                <span className="font-semibold">{file?.name}</span>?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleViewFile}
                className="py-3 px-4 bg-white border border-indigo-300 text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition-colors flex flex-col items-center"
              >
                <svg
                  className="w-6 h-6 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  ></path>
                </svg>
                <span>View File</span>
              </button>

              <button
                type="button"
                onClick={handleStartJourney}
                className="py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex flex-col items-center"
              >
                <svg
                  className="w-6 h-6 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  ></path>
                </svg>
                <span>Start Learning Journey</span>
              </button>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={resetUpload}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Upload Another File
              </button>
            </div>
          </div>
        ) : (
          // File selected but not uploaded yet
          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`mr-4 p-3 rounded-lg ${
                    fileType === "pdf"
                      ? "bg-red-100 text-red-600"
                      : fileType === "docx"
                      ? "bg-blue-100 text-blue-600"
                      : fileType === "txt"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {fileType === "pdf" ? (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : fileType === "docx" ? (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : fileType === "txt" ? (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="text-gray-500 hover:text-gray-700"
                title="Remove file"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleActualUpload}
                disabled={isUploading}
                className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-75"
              >
                {isUploading ? "Uploading..." : "Upload File"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
