// filepath: dashboard/src/pages/CollectorAudit.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CollectorStatsCard from '../components/CollectorStatsCard';

export default function CollectorAudit() {
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCount: 0,
    totalScansToday: 0,
    totalViolationsToday: 0,
    suspiciousCount: 0
  });

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      // Fetch all collectors in the ward
      const resCollectors = await api.get('/dashboard/users?role=collector');
      if (resCollectors.success) {
        const collectorList = Array.isArray(resCollectors.data) ? resCollectors.data : (resCollectors.data.users || []);
        
        // Fetch stats for each collector
        const collectorsWithStats = await Promise.all(
          collectorList.map(async (collector) => {
            try {
              const statsRes = await api.get(`/points/collector-stats?collectorId=${collector._id}`);
              if (statsRes.success) {
                const s = statsRes.data;
                const suspicious = (s.scansThisMonth + s.violationsLoggedThisMonth >= 20) && (s.approvalRate >= 95);
                return { ...collector, stats: s, suspicious };
              }
            } catch (err) {
              return { ...collector, stats: null, suspicious: false };
            }
            return { ...collector, stats: null, suspicious: false };
          })
        );

        setCollectors(collectorsWithStats);

        // Aggregate overall stats
        let scans = 0;
        let violations = 0;
        let suspicious = 0;

        collectorsWithStats.forEach(c => {
          if (c.stats) {
            scans += c.stats.scansToday;
            violations += c.stats.violationsLoggedToday;
          }
          if (c.suspicious) suspicious++;
        });

        setStats({
          activeCount: collectorsWithStats.length,
          totalScansToday: scans,
          totalViolationsToday: violations,
          suspiciousCount: suspicious
        });
      }
    } catch (err) {
      console.error('Audit data fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Collector Name,Phone,Scans Today,Violations Today,Approval Rate (30d),Status\n";
    
    collectors.forEach(c => {
      const s = c.stats;
      const status = c.suspicious ? 'Suspicious' : 'Active';
      csvContent += `${c.name},${c.phone},${s?.scansToday || 0},${s?.violationsLoggedToday || 0},${s?.approvalRate || 0}%,${status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collector_audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Collector Activity Audit</h1>
        <button 
          onClick={exportCSV}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
        >
          <span className="text-xl">📥</span> Export CSV
        </button>
      </div>

      {stats.suspiciousCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-red-500 text-xl">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-bold">
                {stats.suspiciousCount} collector(s) flagged for review — unusually high approval rate detected.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Active Collectors</p>
          <p className="text-3xl font-bold text-gray-900">{stats.activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Scans Today</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalScansToday}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Violations Today</p>
          <p className="text-3xl font-bold text-red-600">{stats.totalViolationsToday}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Suspicious Activity</p>
          <p className={`text-3xl font-bold ${stats.suspiciousCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.suspiciousCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Collector Performance</h2>
        </div>
        
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : collectors.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No collectors found in this ward</div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collectors.map(collector => (
              <CollectorStatsCard key={collector._id} collector={collector} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
