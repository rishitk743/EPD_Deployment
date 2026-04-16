/**
 * Centralized API client wrapper for the Smart Resume Builder backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UploadResumeResponse {
  resume_text: string;
  keywords: string[];
}

export interface AnalyzeRequest {
  resume_text: string;
  job_description: string;
  weights?: Record<string, number>;
}

export interface ATSCategoryScore {
  score: number;
  label: string;
  feedback: string[];
}

export interface AnalyzeResponse {
  ats_score: number;
  category_scores: ATSCategoryScore[];
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface OptimizeRequest {
  resume_text: string;
  job_description: string;
  missing_keywords: string[];
  user_id?: string;
}

export interface OptimizeResponse {
  optimized_resume: string;
  structured_resume: any;
  ats_score: number;
  category_scores: ATSCategoryScore[];
}

export interface GenerateRequest {
  optimized_resume: string;
}

export interface GeneratePdfRequest {
  structured_resume: any;
}

// API client functions
export const apiClient = {
  async uploadResume(file: File): Promise<UploadResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-resume`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed (Status ${response.status} at ${API_BASE_URL}): ${response.statusText}`);
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
      throw new Error(`Analysis failed: ${response.statusText}`);
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
      throw new Error(`Optimization failed: ${response.statusText}`);
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
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    return response.blob();
  },

  async generatePdf(req: GeneratePdfRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  },

  async downloadResume(blob: Blob, filename: string = 'optimized_resume.docx') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getHistory(userId?: string): Promise<any[]> {
    const url = userId 
      ? `${API_BASE_URL}/history?user_id=${userId}`
      : `${API_BASE_URL}/history`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }
    return response.json();
  },

  async googleAuth(credential: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (!response.ok) {
      throw new Error(`Google Auth failed: ${response.statusText}`);
    }

    return response.json();
  },
};
