// filepath: dashboard/src/components/CollectorStatsCard.jsx
import React, { useState } from 'react';

export default function CollectorStatsCard({ collector }) {
  const [expanded, setExpanded] = useState(false);
  
  const initials = collector.name ? collector.name.substring(0, 2).toUpperCase() : '??';
  const s = collector.stats || {};
  
  const approvalRate = s.approvalRate || 0;
  let rateColor = 'bg-gray-200';
  let textColor = 'text-gray-700';
  
  if (approvalRate >= 95 && (s.scansThisMonth + s.violationsLoggedThisMonth >= 20)) {
    rateColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (approvalRate > 85) {
    rateColor = 'bg-amber-400';
    textColor = 'text-amber-600';
  } else if (approvalRate >= 60) {
    rateColor = 'bg-green-500';
    textColor = 'text-green-600';
  }

  return (
    <div className={`border rounded-xl p-5 shadow-sm transition-all ${collector.suspicious ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'}`}>
      {/* Top Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">{collector.name}</h3>
            <p className="text-xs text-gray-500">{collector.phone}</p>
          </div>
        </div>
        {collector.suspicious && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Review</span>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex bg-gray-50 rounded-lg p-3 mb-4 divide-x divide-gray-200 border border-gray-100">
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Scans Today</p>
          <p className="text-xl font-bold text-green-600">{s.scansToday || 0}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Violations</p>
          <p className="text-xl font-bold text-red-600">{s.violationsLoggedToday || 0}</p>
        </div>
      </div>

      {/* Approval Rate */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-medium text-gray-600">30-Day Approval Rate</span>
          <span className={`text-sm font-bold ${textColor}`}>{approvalRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full ${rateColor}`} style={{ width: `${approvalRate}%` }}></div>
        </div>
      </div>

      {/* Expand Toggle */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 pt-2 border-t border-gray-100"
      >
        {expanded ? 'Hide Activity' : 'View Recent Activity'}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 max-h-48 overflow-y-auto">
          {s.topHouseholdsToday && s.topHouseholdsToday.length > 0 ? (
            s.topHouseholdsToday.slice(0, 10).map((hh, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-gray-800">{hh.citizenName}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{hh.address}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                  {new Date(hh.scannedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-gray-500">No scans today yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
