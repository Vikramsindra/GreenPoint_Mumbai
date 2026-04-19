// filepath: dashboard/src/components/Badge.jsx
import React from 'react';

export default function Badge({ status }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPEALED: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
    FINE_ISSUED: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-600',
    tier1: 'bg-orange-100 text-orange-800',
    tier2: 'bg-red-100 text-red-700',
    tier3: 'bg-red-200 text-red-900',
  };

  const currentStyle = styles[status] || 'bg-gray-100 text-gray-800';

  let displayLabel = status;
  if(status.startsWith('tier')) {
      displayLabel = `Tier ${status.replace('tier', '')}`;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${currentStyle}`}>
      {displayLabel}
    </span>
  );
}
