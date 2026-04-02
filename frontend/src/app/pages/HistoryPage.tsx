import { useEffect, useState } from "react";
import { Clock, FileText, Download, Eye, Lock, ShieldCheck } from "lucide-react";
import { apiClient } from "../../services/api";

interface HistoryItem {
  id: number;
  resume_text: string;
  job_description: string;
  optimized_resume: string;
  ats_score: number;
  created_at: string;
}

export function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        loadHistory(parsedUser.userid);
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadHistory = async (userId: string) => {
    try {
      const data = await apiClient.getHistory(userId);
      setHistoryItems(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#16A34A]";
    if (score >= 60) return "text-[#14B8A6]";
    return "text-[#DC2626]";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-teal-50";
    return "bg-red-50";
  };

  const averageScore =
    historyItems.length > 0
      ? Math.round(
          historyItems.reduce((sum, item) => sum + item.ats_score, 0) /
            historyItems.length
        )
      : 0;

  const bestScore =
    historyItems.length > 0
      ? Math.max(...historyItems.map((item) => item.ats_score))
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F766E]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-gray-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#1F2937]">Sign in to view history</h2>
          <p className="text-[#4B5563] mt-2">
            Your resume optimization history is private and tied to your account. 
            Please sign in with Google to access your previous analyses.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3 text-left">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Why sign in?</strong> Signing in allows us to securely store your optimized resumes so you can download them any time from any device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-semibold text-[#1F2937] mb-2">
          Your Optimization History
        </h2>
        <p className="text-[#4B5563]">
          Manage and retrieve your AI-optimized resumes for {user.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <p className="text-sm text-[#4B5563] mb-1 font-medium">Total Analyses</p>
          <p className="text-3xl font-extrabold text-[#1F2937]">
            {historyItems.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <p className="text-sm text-[#4B5563] mb-1 font-medium">Average Score</p>
          <p className="text-3xl font-extrabold text-[#1F2937]">
            {averageScore}%
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
          <p className="text-sm text-[#4B5563] mb-1 font-medium">Best Match</p>
          <p className="text-3xl font-extrabold text-[#16A34A]">
            {bestScore}%
          </p>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#F8F6F2] px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1F2937]">
            Saved Optimizations
          </h3>
          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-500 font-medium uppercase tracking-wider">
            Secure Storage
          </span>
        </div>

        {historyItems.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              No optimizations found yet. Start improving your resume!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {historyItems.map((item) => {
              const dateObj = new Date(item.created_at);
              const date = dateObj.toLocaleDateString();
              const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={item.id}
                  className="p-6 hover:bg-[#F8FBFA] transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-5 flex-1">
                      <div className="w-12 h-12 bg-[#F0FDFA] rounded-xl flex items-center justify-center shadow-sm border border-teal-50">
                        <FileText className="w-6 h-6 text-[#0F766E]" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-bold text-[#1F2937]">
                            Optimization #{item.id}
                          </h4>
                          <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border ${getScoreBg(
                              item.ats_score
                            ).replace('bg-', 'border-').replace('50', '200')} ${getScoreBg(item.ats_score)}`}
                          >
                            <span className={`font-bold ${getScoreColor(item.ats_score)}`}>
                              ATS {item.ats_score.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-[#4B5563] mb-3 line-clamp-1 max-w-2xl italic">
                          "{item.job_description || 'General Analysis'}"
                        </p>

                        <div className="flex items-center gap-4 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {date} • {time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 self-center">
                       <button
                        onClick={() => {
                          const blob = new Blob([item.optimized_resume], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `optimized_resume_${item.id}.txt`;
                          a.click();
                        }}
                        className="p-2.5 bg-gray-50 text-gray-600 hover:text-[#0F766E] hover:bg-[#F0FDFA] rounded-xl border border-gray-100 transition-all flex items-center gap-2"
                        title="Download Text"
                      >
                        <Download size={18} />
                        <span className="text-xs font-bold hidden sm:inline">Text</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}