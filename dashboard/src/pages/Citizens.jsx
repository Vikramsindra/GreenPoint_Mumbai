// filepath: dashboard/src/pages/Citizens.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

export default function Citizens() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState(''); // '' means pointsBalance
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['citizens', search, sortBy, page],
    queryFn: () => api.getCitizens({ search, sortBy, page, limit }),
    keepPreviousData: true
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const getRankBadge = (idx, pageNum) => {
    if (pageNum > 1) return `#${(pageNum-1)*limit + idx + 1}`;
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Citizens Directory</h1>
          {res?.data && (
            <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
              {res.data.totalCount} total
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-[300px] max-w-md">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input 
              type="text" 
              placeholder="Search by name or 10-digit phone number..." 
              className="input pl-9 w-full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            {search && (
              <button 
                type="button"
                onClick={() => {setSearch(''); setSearchInput(''); setPage(1);}}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 font-medium">Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="input bg-white min-w-[200px]"
          >
            <option value="">Highest Balance</option>
            <option value="violationCount30d">Most Violations (30d)</option>
          </select>
        </div>
      </div>

      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 tracking-wider">
              <tr>
                <th className="px-6 py-4 w-20 text-center">Rank</th>
                <th className="px-6 py-4 w-1/4">Name</th>
                <th className="px-6 py-4 w-1/6">Phone</th>
                <th className="px-6 py-4 w-1/6">Society</th>
                <th className="px-6 py-4 w-[12%] text-right">Balance</th>
                <th className="px-6 py-4 w-[12%] text-center">Vio (30d)</th>
                <th className="px-6 py-4 w-[15%] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading citizens...</td></tr>
              ) : res?.data?.citizens?.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No citizens found</td></tr>
              ) : (
                res?.data?.citizens?.map((c, idx) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-center text-lg">{sortBy === '' ? getRankBadge(idx, page) : '-'}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 truncate">{c.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{c.phone}</td>
                    <td className="px-6 py-4 text-gray-500 truncate text-xs">{c.societyId || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${c.pointsBalance > 100 ? 'text-green-600' : 'text-gray-700'}`}>
                        {c.pointsBalance}
                      </span> <span className="text-xs text-gray-500">pts</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded-md text-xs font-bold ${
                        c.violationCount30d > 2 ? 'bg-red-100 text-red-800' :
                        c.violationCount30d > 0 ? 'bg-amber-100 text-amber-800' :
                        'text-green-600'
                      }`}>
                        {c.violationCount30d}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {res?.data && res.data.totalPages > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-200">
          <div>
            Showing {(page - 1) * limit + 1} – {Math.min(page * limit, res.data.totalCount)} of <span className="font-semibold text-gray-900">{res.data.totalCount}</span> citizens
          </div>
          <div className="flex gap-2">
            <button 
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 font-medium"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <div className="flex items-center px-4 font-semibold">Page {page} of {res.data.totalPages}</div>
            <button 
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 font-medium"
              onClick={() => setPage(p => Math.min(res.data.totalPages, p + 1))}
              disabled={page === res.data.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
