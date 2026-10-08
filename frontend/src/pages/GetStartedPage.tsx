import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, LogIn, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { RoutePilotBackground } from '../components/auth/RoutePilotBackground';

export const GetStartedPage: React.FC = () => {
  return (
    <RoutePilotBackground overlayOpacity="bg-white/30 sm:bg-white/20">
      {/* 1. Universal Glass Header */}
      <header className="sticky top-0 z-30 h-[72px] sm:h-[80px] flex items-center justify-between px-6 sm:px-12 bg-white/85 backdrop-blur-md border-b border-[#DCE8EC]/80 shadow-[0_2px_12px_rgba(23,59,86,0.03)] transition-all">
        {/* Left: RoutePilot Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-[0.22em] text-sm text-[#173B56] group">
          <img src="/app-icon.png" alt="RoutePilot" className="w-7 h-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(245,130,32,0.35)] group-hover:scale-105 transition duration-200 shrink-0" />
          <span>ROUTEPILOT</span>
        </Link>

        {/* Right: Back to Home navigation */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-semibold text-xs sm:text-sm px-4 py-2 rounded-full text-[#587287] hover:text-[#173B56] bg-white/70 hover:bg-white border border-[#DCE8EC]/60 hover:border-[#DCE8EC] shadow-2xs transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* 2. Hero & Workspace Choice Section - Positioned in the clean central area of the background */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-6 py-10 sm:py-14 flex-1 flex flex-col justify-center text-center space-y-9 sm:space-y-11">
        {/* Hero Headings */}
        <div className="space-y-3.5 max-w-2xl mx-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.19em] uppercase text-[#173B56] bg-white/90 backdrop-blur-md border border-[#DCE8EC] px-3.5 py-1.5 rounded-full shadow-2xs">
            <i className="w-1.5 h-1.5 rounded-full bg-[#F58220] block" />
            Field Operations Workspace
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#173B56] tracking-tight leading-[1.1]">
            Welcome to RoutePilot
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#587287] font-medium leading-relaxed max-w-lg mx-auto">
            Plan smarter. Route better.<br className="hidden sm:inline" /> Start with your daily operations.
          </p>
        </div>

        {/* 3. Main Choice Cards: Two-Column Glassmorphic Workspace Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 text-left max-w-3xl mx-auto w-full">
          
          {/* Card 1: CREATE ACCOUNT */}
          <div className="group relative bg-white/90 backdrop-blur-md border border-white/85 rounded-3xl p-7 sm:p-9 transition-all duration-200 hover:-translate-y-1 hover:border-[#F58220]/50 shadow-[0_18px_50px_rgba(23,59,86,0.10)] hover:shadow-[0_22px_55px_rgba(245,130,32,0.15)] flex flex-col justify-between space-y-7">
            <div className="space-y-5">
              {/* Top Accent Icon & Eyebrow */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#EAF8F5] border border-[#8FD8D2]/40 text-[#F58220] flex items-center justify-center group-hover:scale-105 transition duration-200 shadow-2xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#F58220] bg-[#F58220]/10 px-3 py-1 rounded-full">
                  Get Started
                </span>
              </div>

              {/* Headings */}
              <div>
                <h2 className="text-2xl font-bold text-[#173B56] tracking-tight">Create Account</h2>
                <p className="text-sm text-[#587287] mt-2 leading-relaxed">
                  New to RoutePilot? Set up your workspace and configure your field operations team.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-[#DCE8EC]/80 text-xs text-[#587287]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#159A78] shrink-0 mt-0.5" />
                  <span>Configure field collection executives</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#159A78] shrink-0 mt-0.5" />
                  <span>Import daily customer portfolios & PTPs</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#159A78] shrink-0 mt-0.5" />
                  <span>Full access to multi-solver route optimization</span>
                </div>
              </div>
            </div>

            {/* Primary Orange CTA Button */}
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 w-full h-[50px] px-6 rounded-2xl text-sm font-semibold bg-[#F58220] hover:bg-[#E87516] text-white shadow-[0_12px_24px_-10px_rgba(245,130,32,0.85)] hover:shadow-[0_16px_28px_-8px_rgba(245,130,32,0.95)] hover:-translate-y-0.5 transition duration-200 cursor-pointer"
            >
              <span>Create Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: SIGN IN */}
          <div className="group relative bg-white/90 backdrop-blur-md border border-white/85 rounded-3xl p-7 sm:p-9 transition-all duration-200 hover:-translate-y-1 hover:border-[#173B56]/30 shadow-[0_18px_50px_rgba(23,59,86,0.10)] hover:shadow-[0_22px_55px_rgba(23,59,86,0.15)] flex flex-col justify-between space-y-7">
            <div className="space-y-5">
              {/* Top Accent Icon & Eyebrow */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-[#EAF8F5] border border-[#8FD8D2]/40 text-[#173B56] flex items-center justify-center group-hover:scale-105 transition duration-200 shadow-2xs">
                  <LogIn className="w-5 h-5 text-[#5FB8B4]" />
                </div>
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#5FB8B4] bg-[#8FD8D2]/25 px-3 py-1 rounded-full">
                  Existing Users
                </span>
              </div>

              {/* Headings */}
              <div>
                <h2 className="text-2xl font-bold text-[#173B56] tracking-tight">Sign In</h2>
                <p className="text-sm text-[#587287] mt-2 leading-relaxed">
                  Already have an account? Continue to your operations workspace and daily schedules.
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-[#DCE8EC]/80 text-xs text-[#587287]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5FB8B4] shrink-0 mt-0.5" />
                  <span>Operations Manager dashboard & live review</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5FB8B4] shrink-0 mt-0.5" />
                  <span>Field Executive mobile itinerary & navigation</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#5FB8B4] shrink-0 mt-0.5" />
                  <span>Administrator governance & audit trail</span>
                </div>
              </div>
            </div>

            {/* Secondary Navy CTA Button */}
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full h-[50px] px-6 rounded-2xl text-sm font-semibold bg-[#173B56] hover:bg-[#123047] text-white shadow-[0_12px_24px_-10px_rgba(23,59,86,0.45)] hover:shadow-[0_16px_28px_-8px_rgba(23,59,86,0.55)] hover:-translate-y-0.5 transition duration-200 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>

      {/* 4. Minimal Footer */}
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
