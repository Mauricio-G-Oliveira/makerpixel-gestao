import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'auto' | 'light' | 'dark' | 'badge-white';
  showBadge?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'auto',
  showBadge = false,
  className = '',
}) => {
  const isWhiteBadge = variant === 'badge-white' || (showBadge && variant !== 'dark');

  // Cores de texto
  let makerTextColor = 'text-slate-900 dark:text-white';
  let techTextColor = 'text-[#0A2540] dark:text-cyan-300';

  if (isWhiteBadge) {
    makerTextColor = 'text-[#0A2540]';
    techTextColor = 'text-[#0A2540]';
  } else if (variant === 'light') {
    makerTextColor = 'text-white';
    techTextColor = 'text-cyan-300';
  } else if (variant === 'dark') {
    makerTextColor = 'text-[#0A2540]';
    techTextColor = 'text-[#0A2540]';
  }

  // Dimensões do SVG
  const svgDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const textSizes = {
    sm: { main: 'text-base', sub: 'text-[9px]' },
    md: { main: 'text-lg', sub: 'text-[11px]' },
    lg: { main: 'text-2xl', sub: 'text-[12px]' },
    xl: { main: 'text-3xl', sub: 'text-[14px]' },
  }[size];

  const badgeWrapper = isWhiteBadge
    ? 'bg-white px-4 py-2.5 rounded-2xl shadow-xl shadow-cyan-950/20 border border-slate-100'
    : showBadge
    ? 'bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-cyan-500/30 shadow-lg shadow-cyan-950/30'
    : '';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${badgeWrapper} ${className}`}>
      {/* Símbolo Gráfico MakerPixel (3 barras ili + pixel box conectado) */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <svg
          className={`${svgDimensions} transition-transform duration-300 hover:scale-105`}
          viewBox="0 0 54 54"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Barra vertical esquerda (Navy / Azul profundo) */}
          <rect
            x="6"
            y="14"
            width="6.5"
            height="17"
            rx="2.5"
            fill={isWhiteBadge ? '#0A2540' : '#0284C7'}
          />

          {/* Barra vertical central (Mais alta - Ciano elétrico vibrante) */}
          <rect
            x="16.5"
            y="6"
            width="6.5"
            height="25"
            rx="2.5"
            fill="#00A3E0"
          />

          {/* Barra vertical direita (Ciano céu brilhante) */}
          <rect
            x="27"
            y="10.5"
            width="6.5"
            height="20.5"
            rx="2.5"
            fill="#38BDF8"
          />

          {/* Bloco Pixel inferior (Caixa com borda e ponto central) */}
          <rect
            x="6"
            y="35"
            width="10.5"
            height="10.5"
            rx="2.5"
            stroke={isWhiteBadge ? '#0A2540' : '#00A3E0'}
            strokeWidth="2.5"
            fill="none"
          />
          <rect
            x="9.75"
            y="38.75"
            width="3"
            height="3"
            rx="1"
            fill="#00A3E0"
          />

          {/* Linha de conexão de barramento de dados para Techsystem */}
          <path
            d="M19.5 40.25H44"
            stroke="#00A3E0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="45" cy="40.25" r="2.5" fill="#38BDF8" />
        </svg>
      </div>

      {/* Tipografia da Marca: MakerPixel Techsystem */}
      <div className="flex flex-col justify-center leading-tight">
        <div className={`flex items-center tracking-tight ${textSizes.main} font-black`}>
          <span className={`${makerTextColor} transition-colors duration-200`}>Maker</span>
          <span className="text-[#00A3E0] drop-shadow-sm ml-0.5">Pixel</span>
        </div>
        <div className={`flex items-center font-extrabold uppercase mt-[-1px] ${textSizes.sub}`}>
          <span className={`${techTextColor} tracking-[0.22em]`}>Techsystem</span>
        </div>
      </div>
    </div>
  );
};
