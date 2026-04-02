from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class UploadResumeResponse(BaseModel):
    resume_text: str = Field(..., description="Extracted plain text from the resume")
    keywords: List[str] = Field(..., description="Keywords extracted from the resume text")


print("Models module loading...")

class AnalyzeRequest(BaseModel):
    resume_text: str = Field(..., description="Plain text content of the resume")
    job_description: Optional[str] = Field(None, description="Plain text job description")
    weights: Optional[Dict[str, float]] = Field(None, description="Optional weights for ATS categories")

class ATSCategoryScore(BaseModel):
    score: float
    label: str
    feedback: List[str]

class AnalyzeResponse(BaseModel):
    ats_score: float = Field(..., description="Overall weighted ATS score")
    category_scores: List[ATSCategoryScore] = Field(..., description="Breakdown of scores by category")
    matched_keywords: List[str] = Field(..., description="Keywords present in both resume and job description")
    missing_keywords: List[str] = Field(..., description="Keywords present in JD but missing from resume")


class OptimizeRequest(BaseModel):
    resume_text: str = Field(..., description="Original resume text")
    job_description: Optional[str] = Field(None, description="Target job description")
    missing_keywords: Optional[List[str]] = Field(default_factory=list, description="Missing keywords to weave into the resume text")
    user_id: Optional[str] = Field(None, description="Google user ID for persistent history")


class OptimizeResponse(BaseModel):
    optimized_resume: str = Field(..., description="Improved, ATS-friendly resume text")
    structured_resume: Dict[str, Any] = Field(..., description="Structured JSON representation of the resume")
    ats_score: float = Field(..., description="Post-optimization ATS score")
    category_scores: List[ATSCategoryScore] = Field(..., description="Score breakdown after optimization")


class GenerateRequest(BaseModel):
    optimized_resume: str = Field(..., min_length=1, description="Optimized resume text to convert into DOCX")

class GeneratePdfRequest(BaseModel):
    structured_resume: Dict[str, Any] = Field(..., description="Structured resume data for PDF generation")

