import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload, FileText, CheckCircle, XCircle, Lightbulb, Sparkles, Target,
  ChevronDown, ChevronUp, BarChart, AlertCircle, Info
} from 'lucide-react';
import { apiClient, AnalyzeResponse } from '../../services/api';
import { voiceEvents } from '../lib/voiceEvents';

export function Dashboard() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string>('');

  // Voice Event Integration
  useEffect(() => {
    const unsubscribe = voiceEvents.subscribe((event) => {
      if (event.type === 'voice-analysis-complete' && event.data) {
        setAnalysisResults(event.data);
        setHasAnalyzed(true);
      }

      if (event.type === 'voice-resume-updated' && event.data) {
        setResumeText(event.data.text || '');
        if (event.data.filename) {
          // Create a dummy file object for UI display
          setSelectedFile(new File([], event.data.filename, { type: 'application/pdf' }));
        }
      }

      if (event.type === 'voice-upload-trigger') {
        document.getElementById('resume-upload')?.click();
      }

      if (event.type === 'voice-optimize-trigger') {
        handleAnalyze(); // Or direct navigation
      }
    });

    return unsubscribe;
  }, [resumeText, jobDescription]); // Keep dependencies updated

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    try {
      setIsAnalyzing(true);
      const response = await apiClient.uploadResume(file);
      setResumeText(response.resume_text);
    } catch (err) {
      setError(`Failed to upload resume: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSelectedFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJobDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJobDescription(text);
    setCharCount(text.length);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !resumeText) {
      setError('Please upload a resume first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const savedWeights = localStorage.getItem('ats_weights');
      const weights = savedWeights ? JSON.parse(savedWeights) : undefined;

      const response = await apiClient.analyzeResume({
        resume_text: resumeText,
        job_description: jobDescription.trim(),
        weights: weights
      });
      setAnalysisResults(response);
      setHasAnalyzed(true);
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-[#1F2937] mb-2">Resume Analysis</h2>
        <p className="text-[#4B5563]">Upload your resume and paste the job description to get your ATS compatibility score</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg font-semibold text-[#1F2937] mb-4">Resume Upload</h3>
          <label className="block">
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="resume-upload"
              disabled={isAnalyzing}
            />
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all duration-200"
            >
              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-[#E6F7F4] rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-7 h-7 text-[#0F766E]" />
                  </div>
                  <p className="text-sm font-semibold text-[#1F2937]">{selectedFile.name}</p>
                  <p className="text-xs text-[#4B5563] mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setResumeText('');
                    }}
                    className="text-xs text-[#DC2626] mt-2 hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-[#1F2937] mb-1">Upload PDF or DOCX</p>
                  <p className="text-xs text-[#4B5563]">or drag and drop</p>
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1F2937]">Job Description</h3>
            <span className="text-xs text-[#4B5563] bg-gray-100 px-2 py-1 rounded">{charCount} characters</span>
          </div>
          <textarea
            value={jobDescription}
            onChange={handleJobDescChange}
            placeholder="Paste the complete job description here..."
            className="w-full h-56 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent resize-none text-sm text-[#1F2937] placeholder:text-[#9CA3AF] transition-all duration-200"
            disabled={isAnalyzing}
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isAnalyzing}
          className="px-8 py-3.5 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#0D6259] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </div>

      {hasAnalyzed && analysisResults && (
        <div className="space-y-6 mt-12 animate-in fade-in duration-500">
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-md">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-4">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="80" stroke="#E5E7EB" strokeWidth="16" fill="none" />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="#14B8A6"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - analysisResults.ats_score / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-5xl font-bold text-[#1F2937]">{analysisResults.ats_score.toFixed(1)}%</span>
                    <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Overall Score</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-5">
                <h3 className="text-lg font-semibold text-[#1F2937] flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-[#0F766E]" />
                  Category Breakdown
                </h3>
                <div className="space-y-4">
                  {analysisResults.category_scores.map((cat: any) => (
                    <div key={cat.label} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-[#4B5563]">{cat.label}</span>
                        <span className={`font-bold ${getScoreColor(cat.score)}`}>{cat.score.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getBarColor(cat.score)} transition-all duration-1000`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                      <div className="text-xs text-[#6B7280] flex flex-wrap gap-x-4 gap-y-1 pl-1 border-l-2 border-gray-100 mt-2 ml-1">
                        {cat.feedback.map((f: string, i: number) => (
                          <div key={i} className="flex items-start gap-1">
                            <Info className="w-3 h-3 text-[#14B8A6] mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937]">Matched Keywords</h3>
              </div>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                {analysisResults.matched_keywords.map((keyword: string, index: number) => (
                  <span key={index} className="px-3 py-1.5 bg-green-50 text-[#16A34A] text-sm font-medium rounded-md border border-green-200">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-[#DC2626]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1F2937]">Missing Keywords</h3>
              </div>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                {analysisResults.missing_keywords.map((keyword: string, index: number) => (
                  <span key={index} className="px-3 py-1.5 bg-red-50 text-[#DC2626] text-sm font-medium rounded-md border border-red-200">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={() => navigate('/optimize', {
                state: {
                  resumeText,
                  jobDescription,
                  analysisResults
                }
              })}
              className="px-8 py-3.5 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#0D6259] transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center gap-2 transform hover:-translate-y-1"
            >
              <Target className="w-5 h-5" />
              {jobDescription ? 'Optimize Resume for Match' : 'General Resume Optimization'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}