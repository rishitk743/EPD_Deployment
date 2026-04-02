# Deployment and GitHub Guide

## 1. Preparing for GitHub
Before uploading to GitHub, ensure your sensitive information is protected.

### .gitignore
I have already created a `.gitignore` file in the root directory. It ensures that the following are NOT uploaded:
- `.env` (contains your API keys)
- `.venv/` (contains your local python environment)
- `node_modules/` (contains frontend dependencies)
- Build artifacts (`dist/`, `server_log_*.txt`)

### Pushing to GitHub
1. Initialize git (if not already done): `git init`
2. Add all files: `git add .`
3. Commit: `git commit -m "Initialize Resume Optimizer with ATS Scoring and PDF Generation"`
4. Add your remote repository: `git remote add origin https://github.com/YOUR_USERNAME/EPD.git`
5. Push: `git push -u origin main`

---

## 2. Setting Up the Production Environment

### Backend (Python/FastAPI)
I've created a virtual environment for you. To use it in production or locally:
1. **Activate Environment**:
   - Windows: `.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`
2. **Install Requirements**: `pip install -r backend/requirements.txt`
3. **Set Environment Variables**: Ensure your hosting provider (e.g., Render, Railway) has the `OPENAI_AI_KEY` (your Groq key) set in their dashboard.

### Frontend (React/Vite)
1. **Install Dependencies**: `npm install`
2. **Build for Production**: `npm run build`
3. **Deploy**: Upload the `dist/` folder to a static host (e.g., Vercel, Netlify).

---

## 3. Recommended Hosting Providers
- **Backend**: [Render](https://render.com/) or [Railway](https://railway.app/) (Full-stack friendly).
- **Frontend**: [Vercel](https://vercel.com/) (Best for React/Vite).
- **Database**: The current project uses a local SQLite database (`history.db`). For production, consider using a managed PostgreSQL database.

---

## 4. Google Authentication Setup
1. **Google Cloud Console**:
   - Create a new project.
   - Go to "APIs & Services" > "Credentials".
   - Create an "OAuth 2.0 Client ID" for a Web Application.
   - Add `http://localhost:5173` (development) to "Authorized JavaScript origins".
2. **Environment Configuration**:
   - Update `GOOGLE_CLIENT_ID` in both root `.env` and `frontend/.env`.

---

## 5. Final Critical Checks
- **API Key**: Verify your Groq API key in the production environment variables.
- **Dependencies**: 
  - Backend: `pip install google-auth`
  - Frontend: `npm install @react-oauth/google`
- **CORS**: If your frontend and backend are on different domains, ensure `backend/main.py` has the correct `allow_origins`.
