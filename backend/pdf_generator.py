import os
from pathlib import Path
from typing import Dict, Any
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

def generate_pdf_from_structured_resume(data: Dict[str, Any], output_path: Path) -> str:
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    name_style = ParagraphStyle(
        'NameStyle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=2,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#1F2937")
    )
    
    contact_style = ParagraphStyle(
        'ContactStyle',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4B5563")
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=11,
        spaceBefore=14,
        spaceAfter=4,
        fontName='Helvetica-Bold',
        textTransform='uppercase',
        textColor=colors.HexColor("#0F766E"),
        letterSpacing=1
    )
    
    job_title_style = ParagraphStyle(
        'JobTitle',
        parent=styles['Normal'],
        fontSize=10.5,
        fontName='Helvetica-Bold',
        spaceBefore=6,
        spaceAfter=1,
        textColor=colors.HexColor("#111827")
    )
    
    company_style = ParagraphStyle(
        'CompanyStyle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#374151")
    )
    
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Oblique',
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=4
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=9.5,
        spaceAfter=6,
        leading=13,
        textColor=colors.HexColor("#374151")
    )
    
    bullet_style = ParagraphStyle(
        'BulletPoint',
        parent=styles['Normal'],
        fontSize=9.5,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4,
        leading=13,
        textColor=colors.HexColor("#374151")
    )

    story = []

    # 1. Header & Contact Information
    contact = data.get("contact", {})
    story.append(Paragraph(contact.get("name", "Name").upper(), name_style))
    
    contact_info = []
    if contact.get("email"): contact_info.append(contact["email"])
    if contact.get("phone"): contact_info.append(contact["phone"])
    if contact.get("location"): contact_info.append(contact["location"])
    if contact.get("linkedin"): contact_info.append(f"LinkedIn: {contact['linkedin']}")
    
    story.append(Paragraph(" • ".join(contact_info), contact_style))

    def add_section_header(title):
        story.append(Paragraph(title, section_header_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0F766E"), spaceBefore=0, spaceAfter=8))

    # 2. Summary
    if data.get("summary"):
        add_section_header("Professional Summary")
        story.append(Paragraph(data["summary"], body_style))

    # 3. Experience
    if data.get("experience"):
        add_section_header("Professional Experience")
        for exp in data["experience"]:
            # Title
            story.append(Paragraph(exp.get('title', '').upper(), job_title_style))
            # Company | Dates | Location
            comp_info = f"<b>{exp.get('company')}</b> | {exp.get('dates')} | {exp.get('location')}"
            story.append(Paragraph(comp_info, sub_title_style))
            
            # Bullets
            for bullet in exp.get("bullets", []):
                story.append(Paragraph(bullet, bullet_style, bulletText="•"))
            story.append(Spacer(1, 4))

    # 4. Skills
    if data.get("skills"):
        add_section_header("Technical Skills")
        story.append(Paragraph(", ".join(data["skills"]), body_style))

    # 5. Education
    if data.get("education"):
        add_section_header("Education")
        for edu in data["education"]:
            story.append(Paragraph(f"<b>{edu.get('degree')}</b>", job_title_style))
            story.append(Paragraph(f"{edu.get('institution')} | {edu.get('dates', '')}", sub_title_style))
            if edu.get("details"):
                story.append(Paragraph(edu["details"], body_style))
            story.append(Spacer(1, 4))

    # 6. Projects
    if data.get("projects"):
        add_section_header("Key Projects")
        for proj in data["projects"]:
            story.append(Paragraph(f"<b>{proj.get('name')}</b>", job_title_style))
            if proj.get("description"):
                story.append(Paragraph(proj["description"], sub_title_style))
            for bullet in proj.get("bullets", []):
                story.append(Paragraph(bullet, bullet_style, bulletText="•"))
            story.append(Spacer(1, 4))

    # 7. Certifications
    if data.get("certifications"):
        add_section_header("Certifications & Awards")
        for cert in data["certifications"]:
            story.append(Paragraph(cert, bullet_style, bulletText="•"))

    doc.build(story)
    return str(output_path)
