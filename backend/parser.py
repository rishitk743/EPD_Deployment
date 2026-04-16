from __future__ import annotations

import io
import re
from typing import Iterable, List

import fitz  # PyMuPDF
import spacy
from docx import Document
from spacy.language import Language


_NLP: Language | None = None


def _get_nlp() -> Language:
    global _NLP
    if _NLP is None:
        # Expect that en_core_web_sm is installed; if not, raise a clear error
        try:
            _NLP = spacy.load("en_core_web_sm")
        except OSError as exc:
            raise RuntimeError(
                "spaCy model 'en_core_web_sm' is not installed. "
                "Install it with: python -m spacy download en_core_web_sm"
            ) from exc
    return _NLP


def parse_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    texts: List[str] = []
    for page in doc:
        page_text = page.get_text("text")
        if page_text:
            texts.append(page_text)
    raw_text = "\n".join(texts)
    return _clean_text(raw_text)


def parse_docx(data: bytes) -> str:
    with io.BytesIO(data) as fp:
        document = Document(fp)
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
    raw_text = "\n".join(paragraphs)
    return _clean_text(raw_text)


def _clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    # Replace weird whitespace but keep newlines
    text = re.sub(r"[^\S\r\n]+", " ", text)
    # Remove whitespace at ends of lines
    text = re.sub(r"[ \t]+(\r?\n)", r"\1", text)
    # Keep standard ASCII + common currency/symbols, replace others
    text = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]", " ", text)
    return text.strip()


def extract_keywords(text: str) -> List[str]:
    if not text.strip():
        return []
    nlp = _get_nlp()
    doc = nlp(text)
    keywords: List[str] = []
    seen = set()
    for token in doc:
        if token.is_stop or token.is_punct or token.is_space:
            continue
        # Capture Nouns, Proper Nouns, and Adjectives (for skills like 'Scalable', 'Distributed')
        if token.pos_ not in {"NOUN", "PROPN", "ADJ"}:
            continue
        key = token.lemma_.lower().strip()
        if not key or len(key) < 2:
            continue
        if key in seen:
            continue
        seen.add(key)
        keywords.append(key)
    return keywords


def extract_keywords_from_iterable(lines: Iterable[str]) -> List[str]:
    return extract_keywords("\n".join(lines))

