from __future__ import annotations

import os
import json
from typing import List, Dict, Any
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def _get_client() -> Groq:
    # Per user: OPENAI_AI_KEY in .env is actually a Groq key
    api_key = os.getenv("OPENAI_AI_KEY") or os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_AI_KEY (Groq Key) is not set in .env")
    return Groq(api_key=api_key)

JSON_SCHEMA = {
    "contact": { "name": "String", "email": "String", "phone": "String", "linkedin": "String", "location": "String" },
    "summary": "String (professional summary)",
    "experience": [
        { "title": "String", "company": "String", "location": "String", "dates": "String", "bullets": ["String"] }
    ],
    "education": [
        { "degree": "String", "institution": "String", "dates": "String", "details": "String" }
    ],
    "skills": ["String"],
    "certifications": ["String"],
    "projects": [
        { "name": "String", "description": "String", "bullets": ["String"] }
    ]
}

PROMPT_TEMPLATE = """You are a professional resume optimization expert.
Task: Improve the following resume to be highly ATS-friendly{jd_context}.

Requirements:
1. Use strong action verbs (e.g., 'Spearheaded', 'Optimized', 'Architected').
2. Quantify achievements with metrics, percentages, or dollar amounts. This is CRITICAL for the ATS score.
3. {keyword_instruction}
4. DO NOT fabricates experiences. However, you MUST include ALL sections in the JSON schema below (Summary, Experience, Education, Skills, Projects, Certifications).
5. If a section was missing in the original, use professional placeholders or infer them from the content if possible.
6. Ensure the result is a massive improvement over the original in terms of professional tone and impact.
7. Return the result STRICTLY as a JSON object matching this schema:
{schema_json}

Resume:
\"\"\"{resume_text}\"\"\"

{jd_block}
"""

def optimize_resume_with_llm(resume_text: str, job_description: str | None, missing_keywords: List[str] | None) -> Dict[str, Any]:
    client = _get_client()
    
    missing_keywords = missing_keywords or []
    missing_str = ", ".join(sorted({k.strip() for k in missing_keywords if k.strip()}))
    
    jd_context = " and match the provided job description" if job_description else ""
    keyword_instruction = f"Weave in these missing keywords naturally: {missing_str}" if missing_str else "Ensure critical industry standard keywords are normalized for ATS parsing."
    jd_block = f"Job Description:\n\"\"\"{job_description}\"\"\"" if job_description else "Note: No specific job description provided. Optimize for general industry best practices."

    prompt = PROMPT_TEMPLATE.format(
        resume_text=resume_text.strip(),
        jd_context=jd_context,
        keyword_instruction=keyword_instruction,
        jd_block=jd_block,
        schema_json=json.dumps(JSON_SCHEMA, indent=2)
    )

    try:
        print(f"Calling Groq llama-3.3-70b-versatile for optimization...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert resume writer. You respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("LLM returned an empty response.")
        
        structured_data = json.loads(content)
        return structured_data

    except Exception as exc:
        print(f"Groq LLM Error encountered: {exc}")
        raise RuntimeError(f"LLM optimization failed: {exc}") from exc

def structured_resume_to_text(data: Dict[str, Any]) -> str:
    """Converts structured JSON resume back to readable text with explicit headers to satisfy ATS scorers."""
    lines = []
    contact = data.get("contact", {})
    lines.append(contact.get("name", "Name"))
    lines.append(f"{contact.get('email', '')} | {contact.get('phone', '')}")
    lines.append(f"{contact.get('location', '')} | {contact.get('linkedin', '')}")
    lines.append("")
    
    lines.append("SUMMARY")
    lines.append(data.get("summary", "") or "No summary provided.")
    lines.append("")
    
    lines.append("EXPERIENCE")
    experiences = data.get("experience", [])
    if experiences:
        for exp in experiences:
            lines.append(f"{exp.get('title')} | {exp.get('company')}")
            lines.append(f"{exp.get('location')} | {exp.get('dates')}")
            for bullet in exp.get("bullets", []):
                lines.append(f"• {bullet}")
            lines.append("")
    else:
        lines.append("No professional experience listed.")
        lines.append("")
        
    lines.append("SKILLS")
    skills = data.get("skills", [])
    lines.append(", ".join(skills) if skills else "No skills listed.")
    lines.append("")
    
    lines.append("EDUCATION")
    education = data.get("education", [])
    if education:
        for edu in education:
            lines.append(f"{edu.get('degree')} | {edu.get('institution')}")
            lines.append(edu.get("dates", ""))
            if edu.get("details"):
                lines.append(edu.get("details"))
            lines.append("")
    else:
        lines.append("No educational background listed.")
        lines.append("")

    lines.append("PROJECTS")
    projects = data.get("projects", [])
    if projects:
        for proj in projects:
            lines.append(f"{proj.get('name', '')}")
            lines.append(f"{proj.get('description', '')}")
            for bullet in proj.get("bullets", []):
                lines.append(f"• {bullet}")
            lines.append("")
    else:
        lines.append("No projects listed.")
        lines.append("")

    lines.append("CERTIFICATIONS")
    certs = data.get("certifications", [])
    lines.append(", ".join(certs) if certs else "No certifications listed.")
    lines.append("")
        
    return "\n".join(lines)


