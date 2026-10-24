// filepath: dashboard/src/pages/CollectorAudit.jsx
import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

export default function CollectorAudit() {
  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'municipal'
  const [auditData, setAuditData] = useState({
    internalCollectors: [],
    bmcCollectors: [],
    summary: {
      totalInternalCollectors: 0,
      activeInternalCollectorsToday: 0,
      totalBmcCollectors: 0,
      activeBmcCollectorsToday: 0
    },
    wardId: 'N-WARD',
    istBusinessDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.getCollectorAudit();
      if (res?.success) {
        setAuditData(res.data);
      } else {
        setError(res?.message || 'Failed to fetch collector audit data');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching audit data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const exportCSV = () => {
    const isInternal = activeTab === 'internal';
    const dateStr = auditData.istBusinessDate || format(new Date(), 'yyyy-MM-dd');
    let csv = '';

    if (isInternal) {
      csv = 'Collector Name,Phone,Collector ID,Assigned Society,Assigned Households,Inspected Today,Segregated Today,Mixed Today,No Handover Today,Remaining Today,Last Inspection,Status\n';
      auditData.internalCollectors.forEach(c => {
        const lastTime = c.lastInspectionAt ? new Date(c.lastInspectionAt).toLocaleTimeString() : 'None';
        csv += `${escapeCsv(c.name)},${escapeCsv(c.phone)},${escapeCsv(c.collectorId)},${escapeCsv(c.assignedSociety?.name || 'Unassigned')},${c.assignedHouseholds},${c.inspectedToday},${c.segregatedToday},${c.mixedToday},${c.noHandoverToday},${c.remainingToday},${escapeCsv(lastTime)},${escapeCsv(c.activityStatus)}\n`;
      });
    } else {
      csv = 'BMC Collector Name,Phone,Collector ID,Assigned Points,Handovers Logged Today,Successful Handovers,Total Weight (kg),Points Covered Today,Last Handover\n';
      auditData.bmcCollectors.forEach(c => {
        const lastTime = c.lastCollectionAt ? new Date(c.lastCollectionAt).toLocaleTimeString() : 'None';
        csv += `${escapeCsv(c.name)},${escapeCsv(c.phone)},${escapeCsv(c.collectorId)},${c.assignedPointsCount},${c.handoversLoggedToday},${c.successfulHandoversToday},${c.totalWeightToday},${c.pointsCoveredToday},${escapeCsv(lastTime)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${isInternal ? 'internal_collectors' : 'bmc_collectors'}_audit_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { internalCollectors = [], bmcCollectors = [], summary = {}, wardId = 'N-WARD' } = auditData;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Collector Activity Audit</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Ward {wardId}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Operational monitoring based on structured inspections and municipal handovers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAuditData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <span className={`text-base ${refreshing ? 'animate-spin' : ''}`}>🔄</span> Refresh
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchAuditData(true)} className="underline text-red-700 ml-4">Retry</button>
        </div>
      )}

      {/* Role Distinction Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <p className="text-sm font-bold text-blue-900">Operational Role Separation</p>
            <p className="text-xs text-blue-700">
              Internal collectors inspect household handovers in their assigned housing society. BMC collectors verify aggregated society handovers.
            </p>
          </div>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-blue-200 shadow-sm shrink-0">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'internal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Internal Collectors ({internalCollectors.length})
          </button>
          <button
            onClick={() => setActiveTab('municipal')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              activeTab === 'municipal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Municipal BMC Collectors ({bmcCollectors.length})
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Internal Collectors Active</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {summary.activeInternalCollectorsToday || 0} <span className="text-sm font-normal text-gray-500">/ {summary.totalInternalCollectors || 0}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Inspected households today</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Municipal Collectors Active</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">
            {summary.activeBmcCollectorsToday || 0} <span className="text-sm font-normal text-gray-500">/ {summary.totalBmcCollectors || 0}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Logged society handovers today</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Inspections Today</p>
          <p className="text-3xl font-bold text-green-700 mt-1">
            {internalCollectors.reduce((sum, c) => sum + (c.inspectedToday || 0), 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Structured household audits</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Municipal Weight</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">
            {Math.round(bmcCollectors.reduce((sum, c) => sum + (c.totalWeightToday || 0), 0) * 10) / 10} <span className="text-sm font-normal text-gray-500">kg</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Aggregated municipal collection</p>
        </div>
      </div>

      {/* Main Content: Tab 1 (Internal Society Collectors) */}
      {activeTab === 'internal' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-gray-900">Internal Society Collectors</h2>
              <p className="text-xs text-gray-500">
                Assigned by housing societies to inspect resident household handovers
              </p>
            </div>
            <span className="text-xs text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-200 font-medium">
              Today: {auditData.istBusinessDate || 'Current IST Day'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Collector Name</th>
                  <th className="px-5 py-3.5">Assigned Society</th>
                  <th className="px-5 py-3.5 text-center">Assigned HH</th>
                  <th className="px-5 py-3.5 text-center">Inspected Today</th>
                  <th className="px-5 py-3.5 text-center">Breakdown (✓ / ⚠️ / 🚪)</th>
                  <th className="px-5 py-3.5 text-center">Remaining</th>
                  <th className="px-5 py-3.5">Last Inspection</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12">
                      <LoadingSpinner size="md" text="Loading internal collectors..." />
                    </td>
                  </tr>
                ) : internalCollectors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-500 text-sm">
                      No internal society collectors registered in Ward {wardId}.
                    </td>
                  </tr>
                ) : (
                  internalCollectors.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        {c.assignedSociety ? (
                          <div>
                            <p className="font-semibold text-gray-800 text-xs">{c.assignedSociety.name}</p>
                            <p className="text-[11px] text-gray-500 truncate max-w-[180px]">{c.assignedSociety.address}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-gray-800">{c.assignedHouseholds}</span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {c.inspectedToday}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                          <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200" title="Segregated">
                            {c.segregatedToday} ✓
                          </span>
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Mixed">
                            {c.mixedToday} ⚠️
                          </span>
                          <span className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200" title="No Handover">
                            {c.noHandoverToday} 🚪
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-xs font-bold ${c.remainingToday > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {c.remainingToday}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {c.lastInspectionAt ? format(new Date(c.lastInspectionAt), 'HH:mm (dd MMM)') : 'None today'}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                          c.activityStatus === 'Round Completed'
                            ? 'bg-green-100 text-green-800'
                            : c.activityStatus === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.activityStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content: Tab 2 (Municipal BMC Collectors) */}
      {activeTab === 'municipal' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-gray-900">Municipal BMC Bulk Collectors</h2>
              <p className="text-xs text-gray-500">
                Authorized municipal collectors assigned to society bulk collection points
              </p>
            </div>
            <span className="text-xs text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-200 font-medium">
              Today: {auditData.istBusinessDate || 'Current IST Day'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Collector Name</th>
                  <th className="px-5 py-3.5">Assigned Points</th>
                  <th className="px-5 py-3.5 text-center">Handovers Logged Today</th>
                  <th className="px-5 py-3.5 text-center">Successful Handovers</th>
                  <th className="px-5 py-3.5 text-center">Total Weight</th>
                  <th className="px-5 py-3.5 text-center">Points Covered</th>
                  <th className="px-5 py-3.5 text-right">Last Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <LoadingSpinner size="md" text="Loading municipal collectors..." />
                    </td>
                  </tr>
                ) : bmcCollectors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-500 text-sm">
                      No BMC municipal collectors registered in Ward {wardId}.
                    </td>
                  </tr>
                ) : (
                  bmcCollectors.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800 text-xs">
                          {c.assignedPointsCount} collection point(s)
                        </span>
                        {c.assignedPoints && c.assignedPoints.length > 0 && (
                          <p className="text-[11px] text-gray-500 truncate max-w-[200px]">
                            {c.assignedPoints.map(p => p.societyName || p.name).join(', ')}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                          {c.handoversLoggedToday}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                          {c.successfulHandoversToday}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-gray-900 text-sm">{c.totalWeightToday} kg</span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="text-xs font-semibold text-gray-700">
                          {c.pointsCoveredToday} / {c.assignedPointsCount}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right text-xs text-gray-500 whitespace-nowrap">
                        {c.lastCollectionAt ? format(new Date(c.lastCollectionAt), 'HH:mm (dd MMM)') : 'None today'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
