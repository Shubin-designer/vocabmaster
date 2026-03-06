import { cva } from 'class-variance-authority';

export const cardVariants = cva(
  // Base styles
  'transition-all',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-2xl',
        popup: 'shadow-2xl backdrop-blur-xl',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      rounded: {
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
      },
      theme: {
        dark: '',
        light: '',
      },
    },
    compoundVariants: [
      // Default card
      {
        variant: 'default',
        theme: 'dark',
        className: 'bg-white/[0.03] border border-white/[0.04]',
      },
      {
        variant: 'default',
        theme: 'light',
        className: 'bg-black/[0.02] border border-black/[0.04]',
      },
      // Elevated card (modals, dropdowns)
      {
        variant: 'elevated',
        theme: 'dark',
        className: 'bg-[#1a1a1e] border border-white/10',
      },
      {
        variant: 'elevated',
        theme: 'light',
        className: 'bg-white border border-gray-200',
      },
      // Popup card (tooltips, popovers)
      {
        variant: 'popup',
        theme: 'dark',
        className: 'bg-[#1a1a1e]/95 border border-white/10',
      },
      {
        variant: 'popup',
        theme: 'light',
        className: 'bg-white/95 border border-black/10 shadow-lg',
      },
    ],
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      rounded: '2xl',
    },
  }
);

export const card = (props, className = '') => {
  return `${cardVariants(props)} ${className}`.trim();
};
