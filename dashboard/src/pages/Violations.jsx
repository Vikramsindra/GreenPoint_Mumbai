// filepath: dashboard/src/pages/Violations.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import ViolationTable from '../components/ViolationTable';
import AppealModal from '../components/AppealModal';

export default function Violations() {
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [toast, setToast] = useState('');

  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['violations', status, type, search, page],
    queryFn: () => api.getAllViolations({ status, type, search, page, limit }),
    keepPreviousData: true
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleResolve = async (outcome) => {
    if (!selectedViolation) return;
    await api.resolveViolation(selectedViolation._id, outcome);
    queryClient.invalidateQueries({ queryKey: ['violations'] });
    queryClient.invalidateQueries({ queryKey: ['wardStats'] });
    setSelectedViolation(null);
    showToast(`Violation successfully ${outcome.toLowerCase()}`);
  };

  const handleExport = async () => {
    try {
      const resp = await api.getAllViolations({ status, type, search, limit: 1000 });
      const vios = resp.data.violations;
      let csv = 'Date,Citizen Name,Phone,Type,Tier,Status,Fine Amount,Points Deducted\n';
      
      vios.forEach(v => {
        const date = new Date(v.createdAt).toISOString().split('T')[0];
        const name = `"${v.citizenId?.name || ''}"`;
        const phone = v.citizenId?.phone || '';
        const vType = v.type;
        csv += `${date},${name},${phone},${vType},${v.tier},${v.status},${v.fineAmount},${v.pointsDeducted}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Violations_Export_${new Date().toISOString().split('T')[0]}.csv`);
      a.click();
    } catch(e) {
      alert("Export failed");
    }
  };

  const tabs = [
    { id: '', label: 'All' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'APPEALED', label: 'Appealed' },
    { id: 'RESOLVED', label: 'Resolved' },
    { id: 'FINE_ISSUED', label: 'Fine Issued' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Violation Management</h1>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
          <span>⬇️</span> Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatus(tab.id); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                status === tab.id 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={type} 
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="input bg-white min-w-[200px]"
          >
            <option value="">All Types</option>
            <option value="NON_SEGREGATION">Non-Segregation</option>
            <option value="LITTERING">Littering</option>
            <option value="BURNING">Burning</option>
            <option value="BULK_VIOLATION">Bulk Violation</option>
          </select>
          
          <form onSubmit={handleSearchSubmit} className="relative">
            <input 
              type="text" 
              placeholder="Search phone..." 
              className="input pl-9 w-64"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </form>
        </div>
      </div>

      <ViolationTable 
        violations={res?.data?.violations} 
        isLoading={isLoading} 
        onReview={setSelectedViolation} 
      />

      {res?.data && res.data.totalPages > 0 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-200">
          <div>
            Showing {(page - 1) * limit + 1} – {Math.min(page * limit, res.data.totalCount)} of <span className="font-semibold text-gray-900">{res.data.totalCount}</span> violations
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

      {selectedViolation && (
        <AppealModal 
          violation={selectedViolation} 
          onClose={() => setSelectedViolation(null)} 
          onResolve={handleResolve} 
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-50 text-green-800 border fill-green-600 border-green-200 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
          <span className="text-xl">✅</span>
          <span className="font-semibold">{toast}</span>
        </div>
      )}
    </div>
  );
}
