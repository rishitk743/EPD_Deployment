import { useState, useEffect } from 'react';
import { User, Bell, Globe, Save, Settings2, RotateCcw, Info } from 'lucide-react';

const DEFAULT_WEIGHTS = {
  Content: 30,
  Skills: 25,
  Format: 15,
  Sections: 15,
  Style: 15
};

export function SettingsPage() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [isSaved, setIsSaved] = useState(false);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Load weights
    const savedWeights = localStorage.getItem('ats_weights');
    if (savedWeights) {
      setWeights(JSON.parse(savedWeights));
    }

    // Load user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleWeightChange = (key: string, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    localStorage.setItem('ats_weights', JSON.stringify(weights));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-[#1F2937] mb-1 md:mb-2">Settings</h2>
          <p className="text-sm md:text-base text-[#4B5563]">Manage your account preferences and scoring rules</p>
        </div>
        {isSaved && (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
            Settings saved successfully!
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scoring Weights Settings */}
          <div className="bg-white border-2 border-[#14B8A6] rounded-lg p-4 md:p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <div className={`text-xs font-bold px-2 py-1 rounded ${Math.abs(totalWeight - 100) < 0.1 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                Total: {totalWeight}%
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-[#F0FDFA] rounded-full flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-[#0F766E]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1F2937]">ATS Scoring Weights</h3>
                <p className="text-xs text-[#4B5563]">Customize how your ATS score is calculated</p>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-[#1F2937]">{key}</label>
                    <span className="text-sm font-bold text-[#0F766E]">{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleWeightChange(key, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                  />
                </div>
              ))}

              <div className="bg-[#F0FDFA] p-4 rounded-lg flex items-start gap-3 mt-4 border border-[#CCFBF1]">
                <Info className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
                <p className="text-xs text-[#0F766E] leading-relaxed">
                  These weights determine the importance of each category in your overall ATS score.
                  Industry standards typically favor <b>Content</b> and <b>Skills</b>.
                  Your current distribution will be applied to all future analyses.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={resetWeights}
                  className="text-xs text-[#6B7280] hover:text-[#1F2937] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-md">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1F2937]">Account Details</h3>
                <p className="text-xs text-[#4B5563]">Your profile information from Google</p>
              </div>
            </div>

            {user ? (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <p className="text-sm font-medium text-[#1F2937] bg-gray-50 p-2 rounded border border-gray-100">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <p className="text-sm font-medium text-[#1F2937] bg-gray-50 p-2 rounded border border-gray-100">{user.email}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Google ID</label>
                  <p className="text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">{user.userid}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">Please sign in to view your account details.</p>
                <div className="inline-block p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-xs">
                  Your profile data is securely retrieved from Google and never shared with third parties.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          <div className="bg-[#0F766E] text-white rounded-lg p-4 md:p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Why adjust weights?</h3>
            <p className="text-sm text-teal-100 leading-relaxed mb-4">
              Different companies and industries prioritize different aspects of a resume.
              Technical roles might value <b>Skills</b> at 40%, while executive roles might favor <b>Content</b> and <b>Style</b>.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-teal-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                Tech Roles: High Skills/Content
              </div>
              <div className="flex items-center gap-2 text-xs text-teal-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                Creative Roles: High Style/Format
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 md:pt-6 border-t border-gray-200">
        <button
          onClick={saveSettings}
          className="w-full sm:w-auto px-8 py-3 bg-[#0F766E] text-white rounded-lg font-semibold hover:bg-[#0D6259] transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </div>
    </div>
  );
}
