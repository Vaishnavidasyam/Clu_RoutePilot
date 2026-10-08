import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RoutePilotBackground } from './RoutePilotBackground';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <RoutePilotBackground overlayOpacity="bg-white/30 sm:bg-white/25">
      {/* 1. Universal Auth Header with Glassmorphic Frost */}
      <header className="sticky top-0 z-30 h-[72px] sm:h-[80px] flex items-center justify-between px-6 sm:px-12 bg-white/85 backdrop-blur-md border-b border-[#DCE8EC]/80 shadow-[0_2px_12px_rgba(23,59,86,0.03)] transition-all">
        {/* Left: RoutePilot Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-[0.22em] text-sm text-[#173B56] group">
          <img src="/app-icon.png" alt="RoutePilot" className="w-7 h-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(245,130,32,0.35)] group-hover:scale-105 transition duration-200 shrink-0" />
          <span>ROUTEPILOT</span>
        </Link>

        {/* Right: Canonical Back to Workspace */}
        <Link
          to="/get-started"
          className="inline-flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2 rounded-full text-[#587287] hover:text-[#173B56] bg-white/70 hover:bg-white border border-[#DCE8EC]/60 hover:border-[#DCE8EC] shadow-2xs transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>
      </header>

      {/* 2. Main Content Container - Positioned cleanly in central whitespace */}
      <main className="relative z-10 max-w-xl mx-auto w-full px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center items-center">
        {children}
      </main>

      {/* 3. Universal Auth Footer with Subtle Glass Backdrop */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full px-6 py-5 text-center text-xs text-[#587287] border-t border-[#DCE8EC]/60 bg-white/40 backdrop-blur-sm rounded-t-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div>
          RoutePilot · Intelligent Daily Visit Planning Platform
        </div>
        <div className="flex items-center gap-4 text-[#587287]/80 text-[11px]">
          <span>Privacy</span>
          <span>·</span>
          <span>Terms</span>
          <span>·</span>
          <span>Support</span>
        </div>
      </footer>
    </RoutePilotBackground>
  );
};
