import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles
  'font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2',
  {
    variants: {
      variant: {
        primary: 'bg-pink-vibrant text-white hover:brightness-110',
        secondary: 'border text-inherit',
        danger: 'bg-red-500 text-white hover:brightness-110',
        success: 'bg-mint-vibrant text-white hover:brightness-110',
        purple: 'bg-purple-vibrant text-white hover:brightness-110',
        ghost: 'hover:bg-white/5',
        icon: 'p-2 rounded-xl transition-colors',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'p-3',
        xl: 'p-4',
        icon: 'p-2',
      },
      rounded: {
        full: 'rounded-full',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
      },
      theme: {
        dark: '',
        light: '',
      },
    },
    compoundVariants: [
      // Secondary button theme variants
      {
        variant: 'secondary',
        theme: 'dark',
        className: 'border-white/10 text-white hover:bg-white/5',
      },
      {
        variant: 'secondary',
        theme: 'light',
        className: 'border-gray-300 text-gray-700 hover:bg-gray-50',
      },
      // Ghost button theme variants
      {
        variant: 'ghost',
        theme: 'dark',
        className: 'text-gray-400 hover:text-white hover:bg-white/5',
      },
      {
        variant: 'ghost',
        theme: 'light',
        className: 'text-gray-500 hover:text-gray-900 hover:bg-black/5',
      },
      // Icon button theme variants
      {
        variant: 'icon',
        theme: 'dark',
        className: 'text-gray-400 hover:bg-white/5',
      },
      {
        variant: 'icon',
        theme: 'light',
        className: 'text-gray-500 hover:bg-black/5',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'full',
    },
  }
);

// Helper to combine with custom classes
export const btn = (props, className = '') => {
  return `${buttonVariants(props)} ${className}`.trim();
};
