import { Link, Outlet, useLocation } from 'react-router';
import { FileText, LogOut, User } from 'lucide-react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';

export function Layout() {
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-[#0F766E] p-2 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <span className="text-xl font-semibold text-[#111827]">Smart Resume Builder</span>
            </Link>
            
            <div className="flex items-center gap-6">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/' 
                    ? 'text-[#0F766E]' 
                    : 'text-gray-600 hover:text-[#0F766E]'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/dashboard" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard' 
                    ? 'text-[#0F766E]' 
                    : 'text-gray-600 hover:text-[#0F766E]'
                }`}
              >
                Dashboard
              </Link>

              {user ? (
                <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                  <div className="flex items-center gap-2">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User size={18} className="text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline-block">{user.name}</span>
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
                    useOneTap
                    theme="outline"
                    shape="pill"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-2">
            <p className="font-semibold text-[#111827]">Smart Resume Builder with ATS Optimization</p>
            <p className="text-sm text-gray-600">Final Year Engineering Project - 2026</p>
            <p className="text-xs text-gray-500">Built with React, TypeScript, and Tailwind CSS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}