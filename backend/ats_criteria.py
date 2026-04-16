from __future__ import annotations
import re
from typing import List, Dict, Tuple
from .parser import _get_nlp

def score_content(resume_text: str, jd_text: str | None) -> Dict:
    """
    Scores keyword density, action verbs, and quantified achievements.
    """
    nlp = _get_nlp()
    doc = nlp(resume_text)
    
    feedback = []
    score = 0
    
    # 1. Action Verbs (20% or 33% if no JD)
    action_verbs = [token for token in doc if token.pos_ == "VERB" and token.is_sent_start]
    if len(action_verbs) >= 3: # Reduced from 4
        score += 20 if jd_text else 33.3
    elif len(action_verbs) >= 1: # Higher floor
        score += 15 if jd_text else 20.0
        feedback.append("Increase the use of strong action verbs at the beginning of your bullet points.")
    else:
        feedback.append("Use strong action verbs (e.g., 'Developed', 'Managed', 'Executed') to start your sentences.")

    # 2. Quantified Achievements (40% or 66% if no JD)
    # Digits, percentages, or dollar amounts
    numbers = re.findall(r'\d+|%', resume_text)
    if len(numbers) >= 4: # Reduced from 5
        score += 40 if jd_text else 66.7
    elif len(numbers) >= 2:
        score += 25 if jd_text else 40.0
        feedback.append("Try to quantify more of your achievements with metrics, percentages, or dollar amounts.")
    else:
        feedback.append("Your resume lacks quantified achievements. Use numbers to show the impact of your work.")

    # 3. Keyword Density (40% - skipped if no JD)
    if jd_text:
        from .parser import extract_keywords
        resume_keywords = set(extract_keywords(resume_text))
        jd_keywords = set(extract_keywords(jd_text))
        
        if not jd_keywords:
            score += 40
        else:
            match_ratio = len(resume_keywords.intersection(jd_keywords)) / len(jd_keywords)
            score += min(40, match_ratio * 40)
            if match_ratio < 0.5:
                feedback.append("Your resume keyword density is low compared to the job description.")
    else:
        feedback.append("Add a Job Description to verify keyword density and industry-specific relevance.")

    return {"score": min(100, round(score, 1)), "label": "Content", "feedback": feedback}

def score_skills(resume_text: str, jd_text: str | None) -> Dict:
    """
    Scores matched skills vs JD.
    """
    from .parser import extract_keywords
    resume_keywords = set(extract_keywords(resume_text))
    
    if not jd_text:
        # General evaluation: count skills found in resume
        score = min(100, len(resume_keywords) * 5) # 20 skills = 100%
        return {
            "score": score, 
            "label": "Skills", 
            "feedback": [
                f"Discovered {len(resume_keywords)} skills in your resume.",
                "Provide a Job Description to see how well your skills match specific requirements."
            ]
        }
    
    jd_keywords = set(extract_keywords(jd_text))
    feedback = []
    if not jd_keywords:
        return {"score": 100, "label": "Skills", "feedback": ["No specific skills found in the job description to match against."]}
    
    matched = resume_keywords.intersection(jd_keywords)
    match_ratio = len(matched) / len(jd_keywords)
    score = round(match_ratio * 100, 1)
    
    missing = jd_keywords - resume_keywords
    if missing:
        feedback.append(f"Missing {len(missing)} key skills from the job description.")
        if len(missing) > 5:
            feedback.append(f"Example missing skills: {', '.join(list(missing)[:5])}")
    else:
        feedback.append("Great job! You have matched most of the key skills from the job description.")
        
    return {"score": score, "label": "Skills", "feedback": feedback}

def score_format(resume_text: str) -> Dict:
    """
    Scores parseability and layout.
    """
    feedback = []
    score = 100
    
    # 1. Length check (Realistic thresholds)
    lines = resume_text.splitlines()
    if len(lines) < 15:
        score -= 20
        feedback.append("Resume is quite brief. Ensure you provide enough detail about your roles and impact.")
    elif len(lines) > 250:
        score -= 15
        feedback.append("Resume is too long; modern ATS systems and recruiters prefer 1-2 pages.")
        
    # 2. Complex layout indicators (Mixed spacing)
    if "\t" in resume_text:
        score -= 10
        feedback.append("Detected tab characters, which often suggest tables or columns. Use standard margins.")
    
    # 3. Non-Standard Characters
    special_chars = re.findall(r'[^\w\s,.()-/]', resume_text)
    if len(special_chars) > 30:
        score -= 15
        feedback.append("Excessive special characters or symbols detected; stick to standard ASCII for parsing safety.")

    # 4. Email/Phone presence (Critical for format/contact)
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    # Broader phone pattern: supports +, (), -, ., space, and varying lengths
    phone_pattern = r'(\+?\d{1,4}[-.\s]?)?(\(?\d{1,5}\)?[-.\s]?)?\d{1,5}[-.\s]?\d{1,5}[-.\s]?\d{0,9}'
    
    if not re.search(email_pattern, resume_text):
        score -= 25
        feedback.append("CRITICAL: No valid email address found. Recruiters cannot contact you.")
    
    phone_match = re.search(phone_pattern, resume_text)
    # Ensure it looks like a real number (at least 7 digits total)
    if not phone_match or len(re.sub(r'\D', '', phone_match.group())) < 7:
        score -= 15
        feedback.append("No phone number detected. Professional resumes should include multiple contact methods.")

    return {"score": max(0, round(score, 1)), "label": "Format", "feedback": feedback}

def score_sections(resume_text: str) -> Dict:
    """
    Checks for presence of standard resume sections.
    """
    standard_sections = {
        "Summary": [r"\b(summary|objective|profile|about me|professional summary|executive summary|career objective|professional profile)\b"],
        "Experience": [r"\b(experience|work|employment|history|professional experience|background|professional background|work history|career history|vocational background)\b"],
        "Education": [r"\b(education|academic|studies|qualifications|academic background|scholastic background|degrees)\b"],
        "Skills": [r"\b(skills|competencies|expertise|tools|technical skills|personal skills|core competencies|areas of expertise|technological proficiencies)\b"],
        "Projects": [r"\b(projects|portfolio|achievements|key projects|selected projects|personal projects|notable projects)\b"],
        "Certifications": [r"\b(certifications|certificates|licenses|training|awards|honors|accreditations|professional development)\b"]
    }
    
    missing_sections = []
    found_count = 0
    
    for section_name, patterns in standard_sections.items():
        found = False
        for p in patterns:
            if re.search(p, resume_text, re.IGNORECASE):
                found = True
                break
        if found:
            found_count += 1
        else:
            missing_sections.append(section_name)
            
    score = (found_count / len(standard_sections)) * 100
    feedback = []
    if missing_sections:
        feedback.append(f"Missing recommended sections: {', '.join(missing_sections)}.")
        if "Experience" in missing_sections:
            feedback.append("CRITICAL: Your Experience section was not clearly identified.")
    else:
        feedback.append("Excellent - All standard resume sections were successfully identified.")
        
    return {"score": min(100, round(score, 1)), "label": "Sections", "feedback": feedback}

def score_style(resume_text: str) -> Dict:
    """
    Scores style, tone, and consistency.
    """
    nlp = _get_nlp()
    doc = nlp(resume_text)
    
    feedback = []
    score = 100
    
    # 1. Bullet points count
    bullets = re.findall(r'^\s*[•\-\*]', resume_text, re.MULTILINE)
    if len(bullets) < 5:
        score -= 20
        feedback.append("Use more bullet points to describe your responsibilities and achievements.")
        
    # 2. Average sentence length
    sentences = list(doc.sents)
    if sentences:
        avg_len = sum(len(s) for s in sentences) / len(sentences)
        if avg_len > 25:
            score -= 10
            feedback.append("Sentences are quite long. Keep bullet points concise and direct.")
            
    # 3. Personal pronouns (Avoid)
    personal_pronouns = ["I", "me", "my", "we", "our"]
    found_pronouns = []
    for token in doc:
        if token.text in personal_pronouns:
            found_pronouns.append(token.text)
    
    if found_pronouns:
        score -= 15
        feedback.append("Avoid first-person pronouns (I, me, my). Write in an impersonal tone.")

    return {"score": max(0, score), "label": "Style", "feedback": feedback}
