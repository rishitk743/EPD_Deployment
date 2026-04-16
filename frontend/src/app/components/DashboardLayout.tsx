import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { FileText, Target, History, Settings, HelpCircle, User, LogOut, Mic } from "lucide-react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { apiClient } from "../../services/api";
import { VoiceChatbot } from "./VoiceChatbot";

const navItems = [
  { path: "/", label: "Analyze Resume", icon: FileText },
  { path: "/optimize", label: "Optimize Resume", icon: Target },
  { path: "/history", label: "History", icon: History },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "#", label: "Voice Assistant", icon: Mic }, 
];

export function DashboardLayout() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      const userData = await apiClient.googleAuth(credentialResponse.credential!);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8F6F2]">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-[#1F2937]">Smart Resume Builder</h1>
          <p className="text-xs text-[#4B5563]">ATS Optimization Tool</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <HelpCircle className="w-5 h-5 text-[#4B5563]" />
          </button>
          
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <User size={18} className="text-gray-500" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 hidden lg:inline-block">{user.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="pl-4 border-l border-gray-200">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => console.log('Login Failed')}
                theme="outline"
                shape="pill"
                size="medium"
              />
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-[#0F766E] text-white flex flex-col shadow-lg">
          <nav className="flex-1 py-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={(e) => {
                    if (item.label === "Voice Assistant") {
                      e.preventDefault();
                      // The VoiceChatbot FAB is already available, but we could trigger it here too
                    }
                  }}
                  className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 relative ${
                    isActive
                      ? "bg-[#14B8A6] text-white"
                      : "text-[#F8F6F2] hover:bg-[#0D6259]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Footer in sidebar */}
          <div className="p-6 border-t border-[#0D6259]">
            <p className="text-xs text-[#F8F6F2]/70">Student Project © 2026</p>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <VoiceChatbot />
    </div>
  );
}
