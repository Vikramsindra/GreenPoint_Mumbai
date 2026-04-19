// filepath: dashboard/src/components/StatCard.jsx
import React from 'react';

export default function StatCard({ title, value, unit, change, color, icon }) {
  const colors = {
    green: 'border-t-green-600',
    red: 'border-t-red-600',
    blue: 'border-t-blue-600',
    amber: 'border-t-amber-600'
  };

  const bgColors = {
    green: 'bg-green-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50'
  };

  return (
    <div className={`card p-6 border-t-[3px] ${colors[color] || 'border-t-gray-500'}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-gray-900">{value}</span>
            {unit && <span className="text-base text-gray-500">{unit}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-1 font-medium">{title}</div>
        </div>
        <div className={`w-12 h-12 rounded-full ${bgColors[color] || 'bg-gray-50'} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      {change && (
        <div className={`text-xs mt-3 ${change.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
          {change.includes('+') ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}
