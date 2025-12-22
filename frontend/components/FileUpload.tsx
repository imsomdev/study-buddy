"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, API_ENDPOINTS } from "../lib/api";
import { Upload, FileText, Eye, Sparkles, X, Check, Loader2, Image } from "lucide-react";

type FileType = "pdf" | "docx" | "txt" | null;

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

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(API_ENDPOINTS.uploadFile, {
        method: "POST",
        headers: headers,
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
    } catch (error: any) {
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
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    }
  };

  const handleStartJourney = async () => {
    if (!file) return;

    setIsGeneratingQuestions(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeader: Record<string, string> = {};
      if (token) authHeader['Authorization'] = `Bearer ${token}`;

      const uploadResponse = await fetch(API_ENDPOINTS.uploadFile, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();

      const generateResponse = await fetch(API_ENDPOINTS.generateMcq, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          file_url: uploadResult.file_url,
          num_questions: 5,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.detail || "Question generation failed");
      }

      const result: MCQGenerationResponse = await generateResponse.json();
      console.log("Questions generated:", result);

      sessionStorage.removeItem("currentQuestionIndex");
      sessionStorage.removeItem("selectedChoice");
      sessionStorage.removeItem("isAnswerSubmitted");
      sessionStorage.removeItem("isCorrect");
      sessionStorage.removeItem("validationResult");

      sessionStorage.setItem("generatedQuestions", JSON.stringify(result));
      setNotification({
        type: "success",
        message: `Questions generated successfully from ${result.page_count} pages!`,
      });

      router.push("/questions");
    } catch (error: any) {
      console.error("Question generation error:", error);
      setNotification({
        type: "error",
        message: `Failed to generate questions: ${error.message}`,
      });
      setIsGeneratingQuestions(false);
    }
  };

  const closeNotification = () => {
    setNotification(null);
  };

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
          className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl text-white max-w-[calc(100vw-2rem)] sm:max-w-sm text-sm sm:text-base ${
            notification.type === "success" ? "toast-success" : "toast-error"
          }`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={closeNotification}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Area */}
      <div className="glass-panel p-4 sm:p-6 animate-glow">
        {!file && !isUploadComplete ? (
          /* Drop Zone */
          <div
            className={`glass-upload p-6 sm:p-8 md:p-10 text-center cursor-pointer ${
              isDragActive ? "active" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onClick={handleUploadClick}
          >
            <div className="flex flex-col items-center justify-center">
              {/* Upload Icon with Image Preview */}
              <div className="relative mb-4 sm:mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-bounce-subtle">
                  <Image className="w-8 h-8 sm:w-10 sm:h-10 text-white/70" />
                </div>
                <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                  <Upload className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                </div>
              </div>

              <p className="text-xl sm:text-2xl font-semibold text-white mb-2">
                Drag your files here
              </p>
              <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base">or click to browse</p>
              
              <button
                type="button"
                className="btn-primary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
              >
                Browse Files
              </button>
              
              <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-white/60">
                Supports PDF, DOCX, and TXT files
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
          /* Upload Progress */
          <div className="glass-upload p-6 sm:p-8 md:p-10">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </div>

              <p className="text-lg sm:text-xl font-semibold text-white mb-2 text-center">
                Uploading {file?.name}
              </p>
              <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base text-center">
                Please wait while we process your file...
              </p>

              <div className="w-full max-w-xs bg-white/10 rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white/50 to-white rounded-full transition-all duration-300 ease-out progress-shimmer"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-white/70">{uploadProgress}%</p>
            </div>
          </div>
        ) : isGeneratingQuestions ? (
          /* Generating Questions */
          <div className="glass-upload p-6 sm:p-8 md:p-10">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6">
                <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white animate-spin-slow" />
                </div>
              </div>

              <p className="text-lg sm:text-xl font-semibold text-white mb-2 text-center">
                Generating Questions
              </p>
              <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base text-center">
                Creating study materials for you...
              </p>

              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-white/50"
                    style={{
                      animation: 'bounce 1s infinite',
                      animationDelay: `${i * 0.15}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : isUploadComplete ? (
          /* Upload Complete */
          <div className="glass-upload p-6 sm:p-8 md:p-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-emerald-500/30">
                <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Upload Successful!
              </h2>
              <p className="text-white/70">
                Your file has been processed successfully
              </p>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <p className="text-white/80 text-sm sm:text-base">
                What would you like to do with{" "}
                <span className="font-semibold text-white break-all">{file?.name}</span>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleViewFile}
                className="glass-btn py-3 sm:py-4 px-4 sm:px-6 flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">View File</span>
              </button>

              <button
                type="button"
                onClick={handleStartJourney}
                className="btn-primary py-3 sm:py-4 px-4 sm:px-6 flex flex-col items-center gap-1.5 sm:gap-2"
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-base">Start Learning</span>
              </button>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <button
                type="button"
                onClick={resetUpload}
                className="text-white/60 hover:text-white font-medium text-sm transition-colors"
              >
                Upload Another File
              </button>
            </div>
          </div>
        ) : (
          /* File Selected */
          <div className="glass-upload p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
                    fileType === "pdf"
                      ? "bg-rose-500/20 text-rose-300"
                      : fileType === "docx"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base sm:text-lg truncate">{file?.name}</p>
                  <p className="text-xs sm:text-sm text-white/60">
                    {file && (file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 sm:mt-6">
              <button
                type="button"
                onClick={handleActualUpload}
                disabled={isUploading}
                className="w-full btn-primary py-3 sm:py-4 text-base sm:text-lg disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Upload File"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
