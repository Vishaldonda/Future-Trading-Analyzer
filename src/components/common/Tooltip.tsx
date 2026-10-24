import React from 'react';

export interface TooltipProps {
  /** The tooltip text to display on hover */
  content: string;
  /** The target element that triggers the tooltip */
  children: React.ReactNode;
  /** Optional additional class names for the container wrapper */
  className?: string;
}

/**
 * Hover tooltip component using Tailwind CSS relative group pattern.
 * Displays content in a floating card centered above the trigger element.
 */
export function Tooltip({ content, children, className = '' }: TooltipProps): React.JSX.Element {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <div className={`relative group inline-flex items-center ${className}`}>
      {children}
      <div
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-slate-200 text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
      >
        {content}
        {/* Downward triangle arrow */}
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-700 w-0 h-0"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
