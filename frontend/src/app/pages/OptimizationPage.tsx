import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Download, RefreshCw, CheckCircle, Loader, FileDown, FileText, BarChart, Info, Target, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient, AnalyzeResponse, ATSCategoryScore } from '../../services/api';

export function OptimizationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [optimizedResumeText, setOptimizedResumeText] = useState<string | null>(null);
  const [structuredResume, setStructuredResume] = useState<any | null>(null);
  const [postOptimizationScore, setPostOptimizationScore] = useState<number | null>(null);
  const [postOptimizationScores, setPostOptimizationScores] = useState<ATSCategoryScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial data from Dashboard
  const resumeText = state?.resumeText || '';
  const jobDescription = state?.jobDescription || '';
  const analysisResults = state?.analysisResults as AnalyzeResponse | undefined;

  useEffect(() => {
    if (resumeText) {
      generateOptimizedResume();
    } else {
      setLoading(false);
      setError('Missing resume text. Please go back to the Dashboard to upload your resume first.');
    }
  }, []);

  const generateOptimizedResume = async () => {
    if (!resumeText) {
      setError('Missing resume text for optimization');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const savedUser = localStorage.getItem('user');
      const user = savedUser ? JSON.parse(savedUser) : null;

      const response = await apiClient.optimizeResume({
        resume_text: resumeText,
        job_description: jobDescription || '',
        missing_keywords: analysisResults?.missing_keywords || [],
        user_id: user?.userid
      });
      setOptimizedResumeText(response.optimized_resume);
      setStructuredResume(response.structured_resume);
      setPostOptimizationScore(response.ats_score);
      setPostOptimizationScores(response.category_scores);
    } catch (err) {
      setError(`Optimization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsOptimizing(false);
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await generateOptimizedResume();
    setIsRegenerating(false);
  };

  const handleDownloadPdf = async () => {
    if (!structuredResume) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await apiClient.generatePdf({
        structured_resume: structuredResume,
      });
      apiClient.downloadResume(blob, 'optimized_resume.pdf');
    } catch (err) {
      setError(`PDF download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!optimizedResumeText) return;
    try {
      const blob = await apiClient.generateDocx({
        optimized_resume: optimizedResumeText,
      });
      apiClient.downloadResume(blob, 'optimized_resume.docx');
    } catch (err) {
      setError(`DOCX download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-[#14B8A6] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Brewing your optimized resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-[#1F2937] mb-1 md:mb-2">Resume Optimization</h2>
          <p className="text-sm md:text-base text-[#4B5563]">Your AI-optimized resume is ready for download in ATS-compliant format</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || isOptimizing}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-[#1F2937] rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={!structuredResume || isOptimizing || isDownloadingPdf}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#0F766E] text-white rounded-lg font-medium hover:bg-[#0D6259] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-sm"
          >
            {isDownloadingPdf ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            <span className="hidden sm:inline">Download PDF (Recommended)</span>
            <span className="sm:hidden">Download PDF</span>
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={!optimizedResumeText || isOptimizing}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-lg font-medium hover:bg-teal-100 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Download DOCX
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Content */}
      {isOptimizing ? (
        <div className="flex items-center justify-center min-h-[400px] bg-white border border-gray-200 rounded-xl shadow-inner">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#F0FDFA] rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-[#14B8A6] animate-pulse" />
            </div>
            <p className="text-gray-600 font-medium">Reconstructing your professional story...</p>
            <p className="text-xs text-gray-400 mt-2">LLM is weaving keywords and formatting sections</p>
          </div>
        </div>
      ) : optimizedResumeText ? (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Comparison Views */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700">Original</h3>
              </div>
              <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Score: {analysisResults?.ats_score}%</span>
            </div>
            <div className="text-xs md:text-sm text-gray-500 whitespace-pre-wrap overflow-y-auto max-h-[300px] md:max-h-[500px] font-mono bg-gray-50 p-3 md:p-4 rounded-lg">
              {resumeText}
            </div>
          </div>

          <div className="bg-white border-2 border-[#14B8A6] rounded-xl p-4 md:p-6 shadow-xl relative mt-6 lg:mt-0">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#14B8A6] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              ATS-Optimized Version
            </div>

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-teal-50">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-lg font-semibold text-[#1F2937]">Improved Resume</h3>
              </div>
              <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                New Score: {postOptimizationScore}%
              </span>
            </div>

            <div className="text-xs md:text-sm text-[#1F2937] whitespace-pre-wrap overflow-y-auto max-h-[300px] md:max-h-[500px] bg-[#F0FDFA] p-3 md:p-6 rounded-lg leading-relaxed shadow-inner">
              {optimizedResumeText}
            </div>
          </div>
        </div>
      ) : null}

      {/* Post-Optimization Insights */}
      {postOptimizationScores && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-8 shadow-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#F0FDFA] rounded-full flex items-center justify-center">
              <BarChart className="w-6 h-6 text-[#0F766E]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#1F2937]">Post-Optimization Breakdown</h3>
              <p className="text-sm text-[#6B7280]">How the AI improved your resume across categories</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {postOptimizationScores.map((cat) => (
              <div key={cat.label} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-500 uppercase mb-2">{cat.label}</span>
                <div className={`text-2xl font-black ${getScoreColor(cat.score)} mb-1`}>{cat.score}%</div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full bg-[#14B8A6] transition-all duration-1000`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="text-[#0F766E] font-semibold text-sm hover:underline flex items-center gap-1"
            >
              Analyze another resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}