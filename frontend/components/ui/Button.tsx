import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-white/20 active:scale-[0.98]',
    secondary:
      'bg-[#121217] hover:bg-[#181820] text-zinc-200 border border-zinc-800 shadow-sm hover:border-zinc-700 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-zinc-100 border border-transparent active:scale-[0.98]',
    danger:
      'bg-rose-600/90 hover:bg-rose-600 text-white font-medium border border-rose-500/40 shadow-sm hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-[0.98]',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className={`inline-block rounded-full animate-spin border-2 border-current border-t-transparent ${
            size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
          }`}
        />
      )}
      {children}
    </button>
  );
}
