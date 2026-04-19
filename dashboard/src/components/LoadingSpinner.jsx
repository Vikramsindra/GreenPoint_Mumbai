// filepath: dashboard/src/components/LoadingSpinner.jsx
import React from 'react';

export default function LoadingSpinner({ size = 'md', text }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${sizeMap[size]} animate-spin rounded-full border-4 border-gray-200 border-t-primary`}></div>
      {text && <p className="mt-2 text-sm text-gray-500">{text}</p>}
    </div>
  );
}
