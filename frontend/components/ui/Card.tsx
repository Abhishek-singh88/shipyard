import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  interactive = false,
}: CardProps) {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-xl border border-zinc-800/80 bg-[#0d0d12]/90 backdrop-blur-md shadow-lg ${
        interactive
          ? 'transition-all duration-200 hover:border-zinc-600 hover:bg-[#13131a] hover:shadow-xl hover:-translate-y-0.5'
          : ''
      } ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
