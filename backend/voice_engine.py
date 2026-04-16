import os
import io
import base64
import logging
from typing import Optional, Dict, Any
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simplified keyword-based prompt works better for Whisper word-error-rate
RESUME_STT_KEYWORDS = (
    "ATS score, resume optimization, job description, keywords, "
    "analyze my resume, download docx, upload file, career advice."
)

def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)

async def speech_to_text(audio_bytes: bytes, filename: str = "audio.webm") -> Optional[str]:
    """Uses Groq Whisper-large-v3-turbo with explicit JSON extraction and temp=0."""
    client = _get_client()
    
    logger.info(f"STT: {filename}, size: {len(audio_bytes)} bytes")
    
    if len(audio_bytes) < 500:
        logger.warning("Empty or tiny audio data detected.")
        return None

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename 
    
    try:
        response = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3-turbo",
            language="en", 
            prompt=RESUME_STT_KEYWORDS,
            response_format="json",
            temperature=0.0
        )
        
        # Access transcript safely
        transcript = getattr(response, 'text', '') or response.get('text', '')
        
        if not transcript.strip():
            logger.info("Whisper returned empty transcript (silence?)")
            return None
            
        logger.info(f"STT Result: {transcript.strip()}")
        return transcript.strip()
    except Exception as e:
        logger.error(f"STT API Error: {e}")
        return None

async def text_to_speech(text: str) -> Optional[bytes]:
    """Uses Groq Speech API (Orpheus) to convert text to speech."""
    client = _get_client()
    try:
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english",
            voice="tara",
            input=text,
            response_format="wav"
        )
        return response.content
    except Exception as e:
        logger.error(f"TTS Failure: {e}")
        return None

def audio_to_base64(audio_bytes: bytes) -> str:
    """Encodes audio bytes to base64 string."""
    return base64.b64encode(audio_bytes).decode('utf-8')
