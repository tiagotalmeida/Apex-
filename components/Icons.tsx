import React from 'react';

interface IconProps {
  className?: string;
}

export const StopwatchIcon: React.FC<IconProps> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9.5 1.5h5v2.2h-5z" />
    <path d="M19.04 7.7l1.32-1.32-1.41-1.41-1.4 1.4A9 9 0 103 14a9 9 0 0016.04-6.3zM13 15.5h-2V9.5h2v6z" />
  </svg>
);

export const ChartIcon: React.FC<IconProps> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 21h3v-8H3zm5 0h3V3H8zm5 0h3v-12h-3zm5 0h3V6h-3z" />
  </svg>
);

export const BikeIcon: React.FC<IconProps> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.5 10.5h-1.18l-1.3-3.4h1.98V5.2h-3.9l-2 2.9-1.9-2.9H5.2v1.9h2.9l1.1 1.6-1.5 1.8H5.5A4.5 4.5 0 1010 15h3.9l1.7-2 1.2 3.1A4.5 4.5 0 1018.5 10.5zM5.5 13.2a1.8 1.8 0 11.02-3.62 1.8 1.8 0 01-.02 3.62zm13 0a1.8 1.8 0 11.02-3.62 1.8 1.8 0 01-.02 3.62z" />
  </svg>
);

export const PinIcon: React.FC<IconProps> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.4 13c.04-.33.06-.66.06-1s-.02-.67-.06-1l2.03-1.58a.5.5 0 00.12-.63l-1.92-3.33a.5.5 0 00-.6-.22l-2.39.96a7.03 7.03 0 00-1.73-1l-.36-2.54a.5.5 0 00-.49-.41h-3.84a.5.5 0 00-.49.41l-.36 2.54c-.63.25-1.2.59-1.73 1l-2.39-.96a.5.5 0 00-.6.22L2.7 8.78a.5.5 0 00.12.63L4.86 11c-.04.33-.06.66-.06 1s.02.67.06 1l-2.03 1.58a.5.5 0 00-.12.63l1.92 3.33a.5.5 0 00.6.22l2.39-.96c.53.41 1.1.75 1.73 1l.36 2.54a.5.5 0 00.49.41h3.84a.5.5 0 00.49-.41l.36-2.54c.63-.25 1.2-.59 1.73-1l2.39.96a.5.5 0 00.6-.22l1.92-3.33a.5.5 0 00-.12-.63L19.4 13zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6 4l14 8-14 8z" />
  </svg>
);

export const StopIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="5" y="5" width="14" height="14" />
  </svg>
);

export const PinPlusIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C8 2 4.5 5 4.5 9.5c0 5 7.5 11.5 7.5 11.5s7.5-6.5 7.5-11.5C19.5 5 16 2 12 2zm1 9h2v2h-2v2h-2v-2H9v-2h2V8h2v3z"/>
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 2v20h2v-8h4v2h10V4H10V2H4zm6 4h8v6h-8V6z" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);
