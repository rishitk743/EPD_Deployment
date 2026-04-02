import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def test_analyze():
    print("\n--- Testing /analyze ---")
    payload = {
        "resume_text": "John Doe. Software Engineer with 5 years of experience in Python and React. Managed a team of 3. Optimized database queries by 40%.",
        "job_description": "We are looking for a Python Software Engineer with team management experience and database optimization skills.",
        "weights": {
            "Content": 30,
            "Skills": 25,
            "Format": 15,
            "Sections": 15,
            "Style": 15
        }
    }
    response = requests.post(f"{BASE_URL}/analyze", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"Overall ATS Score: {data['ats_score']}%")
        print("Category Scores:")
        for cat in data['category_scores']:
            print(f"  - {cat['label']}: {cat['score']}% (Feedback count: {len(cat['feedback'])})")
    else:
        print(f"Error: {response.status_code}, {response.text}")

def test_optimize():
    print("\n--- Testing /optimize ---")
    payload = {
        "resume_text": "John Doe. Software Engineer.",
        "job_description": "Python Developer with SQL skills.",
        "missing_keywords": ["Python", "SQL"]
    }
    response = requests.post(f"{BASE_URL}/optimize", json=payload)
    if response.status_code == 200:
        data = response.json()
        print(f"Optimized ATS Score: {data['ats_score']}%")
        print("Structured Resume Keys:", data['structured_resume'].keys())
        return data['structured_resume']
    else:
        print(f"Error: {response.status_code}, {response.text}")
        return None

def test_generate_pdf(structured_resume):
    print("\n--- Testing /generate-pdf ---")
    payload = {
        "structured_resume": structured_resume
    }
    response = requests.post(f"{BASE_URL}/generate-pdf", json=payload)
    if response.status_code == 200:
        with open("test_resume.pdf", "wb") as f:
            f.write(response.content)
        print("PDF generated successfully: test_resume.pdf")
    else:
        print(f"Error: {response.status_code}, {response.text}")

if __name__ == "__main__":
    try:
        test_analyze()
        structured = test_optimize()
        if structured:
            test_generate_pdf(structured)
    except Exception as e:
        print(f"Script error: {e}")
