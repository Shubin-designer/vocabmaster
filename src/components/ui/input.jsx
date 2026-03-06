import { cva } from 'class-variance-authority';

export const inputVariants = cva(
  // Base styles
  'w-full focus:outline-none transition-colors',
  {
    variants: {
      variant: {
        default: '',
        mono: 'font-mono text-sm',
      },
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3',
        lg: 'h-12 px-4',
        textarea: 'px-3 py-2',
      },
      rounded: {
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
      },
      theme: {
        dark: 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500',
        light: 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'xl',
    },
  }
);

export const selectVariants = cva(
  // Base styles
  'w-full appearance-none focus:outline-none transition-colors cursor-pointer',
  {
    variants: {
      size: {
        sm: 'h-8 pl-2 pr-6 text-sm',
        md: 'h-10 pl-3 pr-8',
        lg: 'h-12 pl-4 pr-10',
      },
      rounded: {
        lg: 'rounded-lg',
        xl: 'rounded-xl',
      },
      theme: {
        dark: 'bg-[#1a1a1e] border border-white/10 text-white hover:bg-[#222226]',
        light: 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50',
      },
    },
    defaultVariants: {
      size: 'md',
      rounded: 'xl',
    },
  }
);

export const input = (props, className = '') => {
  return `${inputVariants(props)} ${className}`.trim();
};

export const select = (props, className = '') => {
  return `${selectVariants(props)} ${className}`.trim();
};
