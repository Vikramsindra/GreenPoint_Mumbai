// filepath: dashboard/src/components/ViolationTypeChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ViolationTypeChart({ data }) {
  const COLORS = {
    NON_SEGREGATION: '#f59e0b',
    LITTERING: '#ef4444',
    BURNING: '#dc2626',
    BULK_VIOLATION: '#7f1d1d'
  };

  const formattedData = data?.map(item => ({
    name: item._id.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    value: item.count,
    color: COLORS[item._id] || '#9ca3af'
  })) || [];

  const total = formattedData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="h-64 w-full mt-4 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value} violations`, 'Count']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-10%' }}>
        <div className="text-center">
          <span className="block text-2xl font-bold text-gray-800">{total}</span>
          <span className="block text-xs text-gray-500 uppercase tracking-wide">Total</span>
        </div>
      </div>
    </div>
  );
}
