import time
import asyncio
from typing import Dict, List, Any, Optional
from uuid import uuid4

class ChatSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.history: List[Dict[str, str]] = []
        self.resume_text: Optional[str] = None
        self.job_description: Optional[str] = None
        self.analysis_results: Optional[Dict[str, Any]] = None
        self.optimized_resume: Optional[Dict[str, Any]] = None
        self.last_activity = time.time()
        self.lock = asyncio.Lock()

    def update_activity(self):
        self.last_activity = time.time()

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > 20:
            self.history = self.history[-20:]
        self.update_activity()

class SessionStore:
    def __init__(self, expiry_seconds: int = 1800):
        self.sessions: Dict[str, ChatSession] = {}
        self.expiry_seconds = expiry_seconds

    async def get_session(self, session_id: str) -> ChatSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = ChatSession(session_id)
        
        session = self.sessions[session_id]
        session.update_activity()
        return session

    def cleanup(self):
        now = time.time()
        expired = [sid for sid, s in self.sessions.items() if now - s.last_activity > self.expiry_seconds]
        for sid in expired:
            del self.sessions[sid]

# Global session store
session_store = SessionStore()
