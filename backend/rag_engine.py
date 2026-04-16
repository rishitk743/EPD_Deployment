import json
import os
from typing import Dict, Any, List, Optional
from groq import Groq
from dotenv import load_dotenv

from . import ats_engine, llm_engine, parser, resume_generator
from .chat_session import ChatSession

load_dotenv()

# Strict system prompt to prevent hallucinations and clarify agency
SYSTEM_PROMPT = """You are a helpful and professional AI assistant for the Smart Resume Builder.
Your primary role is to help users optimize resumes.

CAPABILITIES & LIMITATIONS:
1. You CANNOT access local computer files, download folders, or paths (e.g., 'resume.pdf from Downloads').
2. If a user asks to upload a file, you MUST reply that you'll open a file picker and return the 'upload_resume' intent.
3. You CAN analyze a resume ONLY after it has been uploaded to the session.
4. You CAN optimize a resume ONLY after it has been analyzed or uploaded.

CONVERSATION STYLE:
- Be concise (2-3 sentences).
- If a resume is missing, don't say you will "handle the process"; instead, say "I can't access your files directly. I'll open a selector for you to pick it."
- Use natural language for scores ("seventy-five percent").

INTENT CATEGORIES:
- `upload_resume`: User mentions a file, filename, or wants to upload.
- `set_jd`: User provides a job description.
- `analyze`: User wants a score or feedback on their resume.
- `optimize`: User wants to rewrite or improve the resume.
- `download`: User wants to save the finished resume.
- `chat`: General talk.

RESPONSE FORMAT (JSON):
{
  "intent": "upload_resume" | "set_jd" | "analyze" | "optimize" | "download" | "chat",
  "reply": "Conversational text",
  "reasoning": "Internal logic for choosing this intent"
}
"""

def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        api_key = os.getenv("OPENAI_AI_KEY")
    return Groq(api_key=api_key)

async def process_chat_message(session: ChatSession, message: str) -> Dict[str, Any]:
    """Processes message with absolute awareness of session state to prevent circular prompts."""
    client = _get_client()
    
    # Inject current session state directly into the prompt to prevent hallucinations
    state_context = (
        f"CURRENT SESSION STATE:\n"
        f"- Resume Uploaded: {'YES' if session.resume_text else 'NO'}\n"
        f"- Job Description Set: {'YES' if session.job_description else 'NO'}\n"
        f"- Analysis Performed: {'YES' if session.analysis_results else 'NO'}\n"
    )
    
    history_context = "\n".join([f"{m['role']}: {m['content']}" for m in session.history[-3:]])
    
    full_prompt = (
        f"{state_context}\n"
        f"RECENT HISTORY:\n{history_context}\n\n"
        f"USER MESSAGE: {message}\n"
        f"Analyze state and history, then determine the single best intent and reply."
    )
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": full_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1 # Low temp for high reliability
        )
        
        result = json.loads(response.choices[0].message.content)
        intent = result.get("intent", "chat")
        reply = result.get("reply", "I'm processing that for you.")
        
        action_result = None
        
        # 1. Logic override: If user mentions a filename but no resume in session, forced request_upload
        if not session.resume_text and (".pdf" in message.lower() or ".docx" in message.lower() or "file" in message.lower()):
            intent = "upload_resume"
            reply = "I see you're referring to a file. I can't reach into your folders directly, so I've opened a file picker for you to select it."

        # 2. Action Execution
        if intent == "analyze":
            if session.resume_text:
                # Even without a JD, we can do a general score based on structure/style
                res = ats_engine.compute_ats_score(session.resume_text, session.job_description or "")
                session.analysis_results = res
                action_result = {"type": "analysis_result", "data": res}
                
                if not session.job_description:
                    reply = f"I've analyzed your resume's general structure and formatting. Your general score is {int(res['ats_score'])}%. For a more accurate compatibility check, please provide a job description."
                else:
                    reply = f"Analysis complete. Your ATS compatibility score for this job is {int(res['ats_score'])}%. {reply}"
            else:
                reply = "I'm ready to analyze, but I haven't received your resume yet. I'll open the upload tool so you can provide it now."
                action_result = {"type": "request_upload"}

        elif intent == "upload_resume":
            action_result = {"type": "request_upload"}
            if "I'll open" not in reply:
                reply = f"{reply} I've opened the file selector for you."

        elif intent == "set_jd":
            if len(message) > 15:
                session.job_description = message
                reply = "Great, I've noted the job description. Should I start the analysis now?"
            else:
                reply = "Please tell me more about the job or paste the description here."

        elif intent == "optimize":
            if session.resume_text:
                res = llm_engine.optimize_resume_with_llm(
                    session.resume_text, 
                    session.job_description or "",
                    session.analysis_results.get("missing_keywords") if session.analysis_results else []
                )
                session.optimized_resume = res
                optimized_text = llm_engine.structured_resume_to_text(res)
                action_result = {"type": "optimization_result", "data": {"text": optimized_text, "structured": res}}
                reply = f"I've optimized your professional summary and keywords. You can see the improved version in the dashboard. {reply}"
            else:
                reply = "I need your resume first before I can optimize it. I'll open the upload tool for you."
                action_result = {"type": "request_upload"}

        # Store history
        session.add_message("user", message)
        session.add_message("assistant", reply)
        
        return {
            "reply": reply,
            "intent": intent,
            "action": action_result
        }

    except Exception as e:
        print(f"RAG Error: {e}")
        return {
            "reply": "I'm sorry, I encountered an error. Could you repeat that?",
            "intent": "error",
            "action": None
        }
