import React from 'react';

interface RoutePilotBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  overlayOpacity?: string; // default subtle translucent overlay
}

/**
 * Reusable Global RoutePilot City/Route Background Component
 * Uses the exact official RoutePilot pastel city/route illustration asset.
 * Features:
 * - Fixed full-page background cover (100% viewport coverage)
 * - Intelligent responsive centering keeping central whitespace clear for UI content
 * - Delicate translucent white overlay (rgba(255,255,255,0.20-0.45)) ensuring high text contrast
 * - No distortion, unnatural stretching, or unwanted clipping
 */
export const RoutePilotBackground: React.FC<RoutePilotBackgroundProps> = ({
  children,
  className = '',
  overlayOpacity = 'bg-white/25 sm:bg-white/20'
}) => {
  return (
    <div
      className={`min-h-screen w-full relative bg-[#F5F9FA] bg-no-repeat bg-cover bg-center bg-fixed ${className}`}
      style={{
        backgroundImage: "url('/routepilot-auth-bg.png')"
      }}
    >
      {/* Subtle translucent reading scrim */}
      <div className={`min-h-screen w-full flex flex-col justify-between backdrop-blur-[1px] ${overlayOpacity}`}>
        {children}
      </div>
    </div>
  );
};
