from __future__ import annotations
import os
import random
from pathlib import Path
from typing import Annotated, List, Dict, Any, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR
from pydantic import BaseModel

from .database import init_db, get_connection
from . import ats_engine, parser, resume_generator, pdf_generator, llm_engine
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .models import (
    AnalyzeRequest,
    AnalyzeResponse,
    GenerateRequest,
    GeneratePdfRequest,
    OptimizeRequest,
    OptimizeResponse,
    UploadResumeResponse,
)
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Smart Resume Builder API",
    description="AI-Powered Smart Resume Builder with ATS Optimization and Job Description Matching",
    version="1.0.0",
)

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_resume(file: Annotated[UploadFile, File(...)]):
    if not file.filename:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="No file provided.")

    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF or DOCX file.",
        )

    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

        if filename.endswith(".pdf"):
            resume_text = parser.parse_pdf(data)
        else:
            resume_text = parser.parse_docx(data)

        keywords = parser.extract_keywords(resume_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse resume: {exc}",
        ) from exc

    return UploadResumeResponse(resume_text=resume_text, keywords=keywords)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_resume(payload: AnalyzeRequest):
    try:
        results = ats_engine.compute_ats_score(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            weights=payload.weights
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return AnalyzeResponse(**results)


@app.post("/optimize", response_model=OptimizeResponse)
async def optimize_resume(request: OptimizeRequest):
    try:
        print(f"--- Optimization Request Started ---")
        # 1. Optimize with LLM
        print(f"Step 1: Calling LLM engine for optimization...")
        structured_resume = llm_engine.optimize_resume_with_llm(
            request.resume_text,
            request.job_description,
            request.missing_keywords
        )
        print(f"Step 2: Successfully received structured resume from LLM.")
        
        # 2. Convert to text for backward compatibility
        print(f"Step 3: Converting structured data to text...")
        optimized_text = llm_engine.structured_resume_to_text(structured_resume)
        
        # 3. Compute real post-optimization ATS score
        print(f"Step 4: Computing post-optimization ATS score...")
        res = ats_engine.compute_ats_score(optimized_text, request.job_description)
        print(f"Step 5: Score computed: {res['ats_score']}%")

        # 4. Save to database
        print(f"Step 6: Saving to database...")
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO history (user_id, resume_text, job_description, optimized_resume, ats_score)
            VALUES (?, ?, ?, ?, ?)
        """, (
            request.user_id,
            request.resume_text,
            request.job_description,
            optimized_text,
            res["ats_score"]
        ))
        conn.commit()
        conn.close()
        print(f"Step 7: Optimization complete.")

        return OptimizeResponse(
            optimized_resume=optimized_text,
            structured_resume=structured_resume,
            ats_score=res["ats_score"],
            category_scores=res["category_scores"]
        )
    except Exception as e:
        print(f"CRITICAL ERROR in /optimize: {type(e).__name__} - {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate")
async def generate_resume_file(payload: GenerateRequest):
    if not payload.optimized_resume.strip():
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Optimized resume text cannot be empty.")

    try:
        output_path = resume_generator.generate_docx_from_resume_text(
            optimized_resume=payload.optimized_resume,
            output_dir=BASE_DIR,
        )
    except Exception as exc: 
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate DOCX resume: {exc}",
        ) from exc

    if not os.path.exists(output_path):
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate resume file.")

    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=os.path.basename(output_path),
    )


@app.post("/generate-pdf")
async def generate_pdf_resume(payload: GeneratePdfRequest):
    try:
        output_path = BASE_DIR / "optimized_resume.pdf"
        pdf_generator.generate_pdf_from_structured_resume(
            data=payload.structured_resume,
            output_path=output_path
        )
    except Exception as exc:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF resume: {exc}",
        ) from exc

    if not os.path.exists(output_path):
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate PDF file.")

    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename="optimized_resume.pdf",
    )

@app.get("/history")
def get_history(user_id: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()

    if user_id:
        cursor.execute("""
        SELECT id, resume_text, job_description, optimized_resume, ats_score, created_at
        FROM history
        WHERE user_id = ?
        ORDER BY created_at DESC
        """, (user_id,))
    else:
        cursor.execute("""
        SELECT id, resume_text, job_description, optimized_resume, ats_score, created_at
        FROM history
        WHERE user_id IS NULL
        ORDER BY created_at DESC
        """)

    rows = cursor.fetchall()
    conn.close()

    history = []
    for row in rows:
        history.append({
            "id": row[0],
            "resume_text": row[1],
            "job_description": row[2],
            "optimized_resume": row[3],
            "ats_score": row[4],
            "created_at": row[5],
        })

    return history

class GoogleAuthRequest(BaseModel):
    credential: str

@app.post("/auth/google")
async def google_auth(payload: GoogleAuthRequest):
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            payload.credential, 
            google_requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )

        # ID token is valid. Get the user's Google ID from the decoded token.
        userid = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')

        return {
            "userid": userid,
            "email": email,
            "name": name,
            "picture": picture,
            "status": "success"
        }
    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token")

@app.get("/health")
async def health_check():
    return {"status": "ok"}