import React, { useState } from 'react';
import { BRAND_CONFIG } from '../../constants/branding';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'white' | 'stacked' | 'badge';
  showSubtitle?: boolean;
  className?: string;
  imgClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  showSubtitle = true,
  className = '',
  imgClassName = '',
}) => {
  const [imgSrc, setImgSrc] = useState(BRAND_CONFIG.logoUrl);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (imgSrc === BRAND_CONFIG.logoUrl && BRAND_CONFIG.remoteLogoUrl && BRAND_CONFIG.remoteLogoUrl !== BRAND_CONFIG.logoUrl) {
      setImgSrc(BRAND_CONFIG.remoteLogoUrl);
    } else {
      setImgError(true);
    }
  };

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  };

  const imageSizes = {
    sm: 'w-8 h-8 max-w-[32px] max-h-[32px]',
    md: 'w-11 h-11 max-w-[44px] max-h-[44px]',
    lg: 'w-14 h-14 max-w-[56px] max-h-[56px]',
    xl: 'w-20 h-20 max-w-[80px] max-h-[80px]',
    '2xl': 'w-28 h-28 max-w-[112px] max-h-[112px]',
  };

  const titleSizes = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-bold tracking-tight',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl font-extrabold tracking-tight',
    '2xl': 'text-3xl font-extrabold tracking-tight',
  };

  const subtitleSizes = {
    sm: 'text-[10px] tracking-wide',
    md: 'text-[11px] tracking-wide',
    lg: 'text-xs tracking-wider',
    xl: 'text-sm tracking-wider',
    '2xl': 'text-base tracking-wider',
  };

  const isWhite = variant === 'white';
  const isStacked = variant === 'stacked';

  const renderLogoGraphic = () => {
    if (imgError) {
      // Fallback SVG emblem if network is blocked
      return (
        <div className={`relative flex-shrink-0 ${containerSizes[size]} rounded-xl bg-[#23285E] p-1.5 shadow-sm border border-[#3591C8]/40 flex items-center justify-center overflow-hidden`}>
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#23285E" />
            <path d="M50 8L50 18M79.7 20.3L72.6 27.4M92 50L82 50M79.7 79.7L72.6 72.6M50 92L50 82M20.3 79.7L27.4 72.6M8 50L18 50M20.3 20.3L27.4 27.4" stroke="#E6E65A" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
            <path d="M22 80L48 52L72 74L88 60L90 80Z" fill="#3591C8" opacity="0.8" />
            <circle cx="50" cy="38" r="8" fill="#E6E65A" />
            <path d="M30 58C36 48 64 48 70 58C62 66 38 66 30 58Z" fill="#FFFFFF" />
            <circle cx="76" cy="24" r="5" fill="#E6E65A" />
          </svg>
        </div>
      );
    }

    return (
      <div
        className={`relative flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200 ${
          variant === 'badge' ? `${containerSizes[size]} rounded-xl bg-white/95 p-1 shadow-sm border border-slate-200/80` : ''
        }`}
      >
        <img
          src={BRAND_CONFIG.logoUrl}
          alt={BRAND_CONFIG.name}
          className={`${imageSizes[size]} object-contain drop-shadow-sm select-none ${imgClassName}`}
          referrerPolicy="no-referrer"
          loading="eager"
          onError={handleImageError}
        />
      </div>
    );
  };

  if (variant === 'icon' || variant === 'badge') {
    return (
      <div className={`inline-flex items-center justify-center select-none ${className}`} id="nyabihu-yego-icon">
        {renderLogoGraphic()}
      </div>
    );
  }

  if (isStacked) {
    return (
      <div className={`flex flex-col items-center text-center gap-3 select-none ${className}`} id="nyabihu-yego-brand-stacked">
        {renderLogoGraphic()}
        <div className="flex flex-col items-center leading-tight">
          <span className={`${titleSizes[size]} ${isWhite ? 'text-white' : 'text-[#23285E]'}`}>
            {BRAND_CONFIG.name.toUpperCase()}
          </span>
          {showSubtitle && (
            <span className={`${subtitleSizes[size]} font-medium ${isWhite ? 'text-[#DFF8F5]' : 'text-[#3591C8]'} mt-0.5`}>
              {BRAND_CONFIG.subTitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="nyabihu-yego-brand-logo">
      {renderLogoGraphic()}

      <div className="flex flex-col leading-tight">
        <span className={`${titleSizes[size]} ${isWhite ? 'text-white' : 'text-[#23285E]'}`}>
          {BRAND_CONFIG.name.toUpperCase()}
        </span>
        {showSubtitle && (
          <span className={`${subtitleSizes[size]} font-medium ${isWhite ? 'text-[#DFF8F5]' : 'text-[#3591C8]'}`}>
            {BRAND_CONFIG.subTitle}
          </span>
        )}
      </div>
    </div>
  );
};
