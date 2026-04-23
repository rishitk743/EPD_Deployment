import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { FileText, Target, History, Settings, HelpCircle, User, LogOut, Mic, Menu, X } from "lucide-react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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
    <div className="h-screen flex flex-col bg-[#F8F6F2] overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 h-14 md:h-16 flex items-center justify-between px-3 md:px-6 shadow-sm relative z-30">
        <div className="flex items-center gap-3">
          {/* Hamburger — visible on mobile only */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-[#1F2937]" />
          </button>

          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-wider text-[#0F766E]">A R I S E</h1>
            <p className="text-[10px] font-medium text-[#4B5563] uppercase tracking-tighter hidden sm:block">AI Resume Improvement and Scoring Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200">
            <HelpCircle className="w-5 h-5 text-[#4B5563]" />
          </button>
          
          {user ? (
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-gray-200">
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
            <div className="pl-2 md:pl-4 border-l border-gray-200">
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

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — desktop: always visible; mobile: slide-in drawer */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-40 md:z-auto
            w-64 bg-[#0F766E] text-white flex flex-col shadow-lg
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:transform-none
            top-14 md:top-0
          `}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-end p-3 md:hidden">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-[#0D6259] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-2 md:py-6">
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
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-6 py-3.5 md:py-3 transition-all duration-200 relative ${
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
        <main className="flex-1 overflow-auto w-full">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <VoiceChatbot />
    </div>
  );
}
