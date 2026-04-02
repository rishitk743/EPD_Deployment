/**
 * API client for Smart Resume Builder backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UploadResumeResponse {
  resume_text: string;
  keywords: string[];
}

export interface AnalyzeRequest {
  resume_text: string;
  job_description: string;
}

export interface AnalyzeResponse {
  ats_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface OptimizeRequest {
  resume_text: string;
  job_description: string;
  missing_keywords: string[];
}

export interface OptimizeResponse {
  optimized_resume: string;
}

export interface GenerateRequest {
  optimized_resume: string;
}

export const apiClient = {
  async uploadResume(file: File): Promise<UploadResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-resume`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  async analyzeResume(req: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || `Analysis failed: ${response.statusText}`);
    }

    return response.json();
  },

  async optimizeResume(req: OptimizeRequest): Promise<OptimizeResponse> {
    const response = await fetch(`${API_BASE_URL}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || `Optimization failed: ${response.statusText}`);
    }

    return response.json();
  },

  async generateDocx(req: GenerateRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.detail || `Generation failed: ${response.statusText}`);
    }

    return response.blob();
  },

  downloadBlob(blob: Blob, filename: string = 'optimized_resume.docx') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
