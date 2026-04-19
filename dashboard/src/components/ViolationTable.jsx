// filepath: dashboard/src/components/ViolationTable.jsx
import React from 'react';
import Badge from './Badge';
import { format, parseISO } from 'date-fns';

export default function ViolationTable({ violations, onReview, isLoading }) {
  const formatType = (type) => type?.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex p-4 border-b border-gray-100 last:border-0">
            <div className="h-4 bg-gray-200 rounded w-1/4 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6 mr-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/6"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left table-fixed">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 tracking-wider">
            <tr>
              <th className="px-6 py-3 w-1/4">Citizen</th>
              <th className="px-6 py-3 w-1/6">Type</th>
              <th className="px-6 py-3 w-[10%]">Tier</th>
              <th className="px-6 py-3 w-[12%]">Status</th>
              <th className="px-6 py-3 w-[10%]">Fine</th>
              <th className="px-6 py-3 w-1/6">Date</th>
              <th className="px-6 py-3 w-[12%] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {violations?.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No violations found
                </td>
              </tr>
            ) : (
              violations?.map((violation) => (
                <tr key={violation._id} className="hover:bg-green-50 transition-colors even:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <div className="font-semibold text-gray-900 truncate">{violation.citizenId?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{violation.citizenId?.phone}</div>
                  </td>
                  <td className="px-6 py-3 text-gray-700 truncate">
                    {formatType(violation.type)}
                  </td>
                  <td className="px-6 py-3">
                    <Badge status={`tier${violation.tier}`} />
                  </td>
                  <td className="px-6 py-3">
                    <Badge status={violation.status} />
                  </td>
                  <td className="px-6 py-3">
                    {violation.fineAmount > 0 ? (
                      <span className="text-red-600 font-medium whitespace-nowrap">₹{violation.fineAmount}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {format(parseISO(violation.createdAt), 'dd MMM yyyy, h:mm a')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {violation.status === 'APPEALED' ? (
                      <button 
                        onClick={() => onReview(violation)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-gray-400 pl-4">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
