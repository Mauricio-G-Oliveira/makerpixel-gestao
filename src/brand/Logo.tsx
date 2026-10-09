import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'auto' | 'light' | 'dark';
  showBadge?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'auto',
  showBadge = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { scale: 'scale-75 origin-left', h: 'h-8' },
    md: { scale: 'scale-90 origin-left', h: 'h-11' },
    lg: { scale: 'scale-100 origin-left', h: 'h-14' },
    xl: { scale: 'scale-125 origin-left', h: 'h-20' },
  };

  const currentSize = sizeMap[size];

  // In dark mode or light variant: Maker is light/white, Techsystem is light/cyan-slate
  // In light mode: Maker is dark navy (#0F2B48), Techsystem is dark navy
  const makerTextColor =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
      ? 'text-[#0F2B48]'
      : 'text-slate-900 dark:text-white';

  const techTextColor =
    variant === 'light'
      ? 'text-cyan-200/90'
      : variant === 'dark'
      ? 'text-[#0F2B48]'
      : 'text-[#0F2B48] dark:text-slate-300';

  const badgeBg =
    showBadge
      ? 'bg-white/95 dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200 dark:border-cyan-500/30 shadow-lg shadow-cyan-950/20 backdrop-blur-sm'
      : '';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${badgeBg} ${className}`}>
      {/* SVG Icon with ili bars + pixel square */}
      <div className="relative flex-shrink-0 flex flex-col items-center justify-center">
        <svg
          className="w-10 h-10 transition-transform duration-300 hover:scale-105"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle tech background circle glow */}
          <rect width="44" height="44" rx="10" className="fill-cyan-500/10 dark:fill-cyan-400/15" />
          
          {/* Top row bars: ili icon */}
          <rect x="7" y="14" width="4.5" height="12" rx="1.5" fill="#0284C7" />
          <rect x="14" y="8" width="4.5" height="18" rx="1.5" fill="#00A3E0" />
          <rect x="21" y="11" width="4.5" height="15" rx="1.5" fill="#38BDF8" />

          {/* Bottom row: Square pixel icon with core dot */}
          <rect x="7" y="28" width="7" height="7" rx="1.5" stroke="#0284C7" strokeWidth="2" fill="none" />
          <rect x="9.5" y="30.5" width="2" height="2" rx="0.5" fill="#00A3E0" />
          
          {/* Tech horizontal interconnect lines */}
          <path d="M16 31.5H35" stroke="#00A3E0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="36" cy="31.5" r="2" fill="#38BDF8" />
        </svg>
      </div>

      {/* Brand Text: MakerPixel Techsystem */}
      <div className="flex flex-col justify-center leading-tight">
        <div className="flex items-center tracking-tight text-xl font-extrabold">
          <span className={`${makerTextColor} transition-colors duration-200`}>Maker</span>
          <span className="text-[#00A3E0] drop-shadow-sm font-black">Pixel</span>
        </div>
        <div className="flex items-center tracking-widest text-[11px] font-bold uppercase mt-[-2px]">
          <span className={`${techTextColor} tracking-[0.2em]`}>Techsystem</span>
        </div>
      </div>
    </div>
  );
};
