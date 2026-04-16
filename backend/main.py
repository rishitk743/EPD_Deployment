from __future__ import annotations
import os
import random
import tempfile
import re
from pathlib import Path
from typing import Annotated, List, Dict, Any, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from .database import init_db, get_connection, put_connection
from . import ats_engine, parser, resume_generator, pdf_generator, llm_engine, voice_engine, rag_engine
from .chat_session import session_store
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
    ChatRequest,
    ChatResponse,
    ChatAction,
)
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Smart Resume Builder API",
    description="AI-Powered Smart Resume Builder with ATS Optimization and Job Description Matching",
    version="1.0.0",
)

@app.on_event("startup")
async def startup():
    init_db()

# Static allowed origins
_frontend_url = os.getenv("FRONTEND_URL")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if _frontend_url:
    ALLOWED_ORIGINS.append(_frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
        structured_resume = llm_engine.optimize_resume_with_llm(
            request.resume_text,
            request.job_description,
            request.missing_keywords
        )
        optimized_text = llm_engine.structured_resume_to_text(structured_resume)
        res = ats_engine.compute_ats_score(optimized_text, request.job_description)

        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO history (user_id, resume_text, job_description, optimized_resume, ats_score)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                request.user_id,
                request.resume_text,
                request.job_description,
                optimized_text,
                res["ats_score"]
            ))
            conn.commit()
        finally:
            put_connection(conn)

        return OptimizeResponse(
            optimized_resume=optimized_text,
            structured_resume=structured_resume,
            ats_score=res["ats_score"],
            category_scores=res["category_scores"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate")
async def generate_resume_file(payload: GenerateRequest, background_tasks: BackgroundTasks):
    if not payload.optimized_resume.strip():
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail="Optimized resume text cannot be empty.")

    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
            output_path = tmp.name
        
        resume_generator.generate_docx_from_resume_text(
            optimized_resume=payload.optimized_resume,
            output_path=output_path,
        )
    except Exception as exc: 
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate DOCX resume: {exc}",
        ) from exc

    if not os.path.exists(output_path):
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate resume file.")

    background_tasks.add_task(os.remove, output_path)
    
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="optimized_resume.docx",
    )


@app.post("/generate-pdf")
async def generate_pdf_resume(payload: GeneratePdfRequest, background_tasks: BackgroundTasks):
    try:
        # Create temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            output_path = Path(tmp.name)
            
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

    background_tasks.add_task(os.remove, str(output_path))
    
    return FileResponse(
        str(output_path),
        media_type="application/pdf",
        filename="optimized_resume.pdf",
    )

@app.get("/history")
def get_history(user_id: Optional[str] = None):
    conn = get_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if user_id:
            cursor.execute("""
            SELECT id, resume_text, job_description, optimized_resume, ats_score, created_at
            FROM history
            WHERE user_id = %s
            ORDER BY created_at DESC
            """, (user_id,))
        else:
            cursor.execute("""
            SELECT id, resume_text, job_description, optimized_resume, ats_score, created_at
            FROM history
            WHERE user_id IS NULL
            ORDER BY created_at DESC
            """)

        history = cursor.fetchall()
        return history
    finally:
        put_connection(conn)

class GoogleAuthRequest(BaseModel):
    credential: str

@app.post("/auth/google")
async def google_auth(payload: GoogleAuthRequest):
    try:
        idinfo = id_token.verify_oauth2_token(
            payload.credential, 
            google_requests.Request(), 
            os.getenv("VITE_GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
        )
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
        raise HTTPException(status_code=401, detail="Invalid Google token")

# --- Chat and Voice Endpoints ---

@app.post("/chat/voice", response_model=ChatResponse)
async def chat_voice(audio: UploadFile, session_id: str = Form(...)):
    """Full voice pipeline: audio in → STT → RAG → LLM → TTS → audio out."""
    try:
        session = await session_store.get_session(session_id)
        audio_bytes = await audio.read()
        transcript = await voice_engine.speech_to_text(audio_bytes, filename=audio.filename)
        
        if not transcript:
            return ChatResponse(reply="I couldn't hear you clearly. Could you say that again?")

        result = await rag_engine.process_chat_message(session, transcript)
        
        reply_text = result["reply"]
        audio_response_bytes = await voice_engine.text_to_speech(reply_text)
        audio_base64 = voice_engine.audio_to_base64(audio_response_bytes) if audio_response_bytes else None

        return ChatResponse(
            reply=reply_text,
            transcript=transcript,
            audio_base64=audio_base64,
            action=result["action"]
        )
    except Exception as e:
        print(f"Chat Voice Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_text(payload: ChatRequest):
    """Text-only chat endpoint."""
    try:
        session = await session_store.get_session(payload.session_id)
        result = await rag_engine.process_chat_message(session, payload.message)
        
        return ChatResponse(
            reply=result["reply"],
            transcript=None,
            audio_base64=None,
            action=result["action"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/upload", response_model=ChatResponse)
async def chat_upload(file: UploadFile, session_id: str = Form(...)):
    """Upload resume within a chat session."""
    try:
        session = await session_store.get_session(session_id)
        filename = file.filename.lower()
        data = await file.read()
        
        if filename.endswith(".pdf"):
            resume_text = parser.parse_pdf(data)
        else:
            resume_text = parser.parse_docx(data)
            
        session.resume_text = resume_text
        session.add_message("assistant", f"I've received your resume ({file.filename}). What would you like me to do with it?")
        
        return ChatResponse(
            reply=f"I've received your resume file. I'm ready to analyze it or help you optimize it.",
            action=ChatAction(type="upload_success", data={"filename": file.filename, "text": resume_text})
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}