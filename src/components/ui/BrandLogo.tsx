import React from 'react';

export const BrandLogo: React.FC<{ className?: string; size?: number; showText?: boolean }> = ({
  className = '',
  size = 28,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Geometric Shield / Book Emblem in Gold */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Hexagonal Shield Outline */}
        <polygon
          points="16,2 29,8 29,22 16,30 3,22 3,8"
          stroke="currentColor"
          strokeWidth="1.75"
          className="text-amber-500 dark:text-[#F5B82E]"
          fill="none"
        />
        {/* Inner Stylized Book & Quill Geometry */}
        <path
          d="M16 8V24M16 11C13 9 8 9.5 6.5 10.5V20.5C8 19.5 13 19 16 21M16 11C19 9 24 9.5 25.5 10.5V20.5C24 19.5 19 19 16 21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500 dark:text-[#F5B82E]"
        />
        <circle
          cx="16"
          cy="6.5"
          r="1.25"
          fill="currentColor"
          className="text-amber-500 dark:text-[#F5B82E]"
        />
      </svg>

      {showText && (
        <span className="font-bold text-base tracking-tight text-[var(--text)]">
          BelajarQuest
        </span>
      )}
    </div>
  );
};
