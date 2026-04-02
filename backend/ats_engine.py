from __future__ import annotations

from typing import List, Set, Tuple, Dict, Any
from .parser import extract_keywords
from . import ats_criteria

DEFAULT_WEIGHTS = {
    "Content": 0.30,
    "Skills": 0.25,
    "Format": 0.15,
    "Sections": 0.15,
    "Style": 0.15
}

def compute_ats_score(
    resume_text: str, 
    job_description: str, 
    weights: Dict[str, float] = None
) -> Dict[str, Any]:
    weights = weights or DEFAULT_WEIGHTS
    
    # 1. Category Scoring
    cat_scores = []
    cat_scores.append(ats_criteria.score_content(resume_text, job_description))
    cat_scores.append(ats_criteria.score_skills(resume_text, job_description))
    cat_scores.append(ats_criteria.score_format(resume_text))
    cat_scores.append(ats_criteria.score_sections(resume_text))
    cat_scores.append(ats_criteria.score_style(resume_text))
    
    # 2. Weighted Score Calculation
    total_score = 0
    weight_total = sum(weights.values())
    
    for cs in cat_scores:
        label = cs["label"]
        # Normalize weight: if sum is 100, divide by 100 to get decimal
        weight = weights.get(label, 0) / weight_total if weight_total > 0 else 0
        total_score += cs["score"] * weight
        
    # 3. Keyword Matching (for backward compatibility and UI)
    jd_keywords = set(extract_keywords(job_description)) if job_description else set()
    resume_keywords = set(extract_keywords(resume_text))
    
    matched = sorted(jd_keywords.intersection(resume_keywords)) if jd_keywords else []
    missing = sorted(jd_keywords.difference(resume_keywords)) if jd_keywords else []
    
    return {
        "ats_score": round(total_score, 1),
        "category_scores": cat_scores,
        "matched_keywords": matched,
        "missing_keywords": missing
    }


def normalize_keyword_set(keywords: List[str]) -> Set[str]:
    return {k.strip().lower() for k in keywords if k.strip()}

