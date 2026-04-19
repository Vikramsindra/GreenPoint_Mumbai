// filepath: dashboard/src/pages/WardOverview.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/StatCard';
import ComplianceChart from '../components/ComplianceChart';
import ViolationTypeChart from '../components/ViolationTypeChart';
import LoadingSpinner from '../components/LoadingSpinner';
import * as api from '../services/api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function WardOverview() {
  const [secondsAgo, setSecondsAgo] = useState(0);

  const { data: res, isLoading, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['wardStats'],
    queryFn: api.getWardStats,
    refetchInterval: 30000
  });

  const { data: vioRes, isLoading: vioLoading } = useQuery({
    queryKey: ['recentViolations'],
    queryFn: api.getRecentViolations,
    refetchInterval: 60000
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [dataUpdatedAt]);

  if (isLoading && !res) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading ward dashboard..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mt-10">
        <p className="text-red-700 font-medium mb-4">Failed to load dashboard data. Please check your connection.</p>
        <button onClick={refetch} className="btn-danger">Retry</button>
      </div>
    );
  }

  const { scansToday, compliancePercent, activeViolations, redemptionsThisMonth, dailyTrend, violationBreakdown, topCitizens } = res.data;
  const recentViolations = vioRes?.data || [];

  const complianceColor = compliancePercent >= 50 ? 'green' : compliancePercent >= 25 ? 'amber' : 'red';

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward N Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated {secondsAgo} seconds ago</p>
        </div>
        <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
          {format(new Date(), 'EEEE, dd MMM yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <StatCard title="Scans Today" value={scansToday.toLocaleString()} color="green" icon="📊" />
        <StatCard title="Daily Compliance" value={compliancePercent} unit="%" color={complianceColor} icon="🎯" />
        <StatCard title="Active Violations" value={activeViolations.toLocaleString()} color="red" icon="⚠️" />
        <StatCard title="Rewards Redeemed" value={redemptionsThisMonth.toLocaleString()} color="blue" icon="🎁" />
      </div>

      <div className="grid grid-cols-3 gap-5 mt-6">
        <div className="col-span-2 card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Daily Scan Trend (Last 7 Days)</h2>
          <ComplianceChart data={dailyTrend} />
        </div>
        <div className="col-span-1 card p-6 flex flex-col">
          <h2 className="text-base font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-2">Violations by Type</h2>
          <div className="flex-1 flex items-center justify-center">
             {violationBreakdown.length > 0 ? (
               <ViolationTypeChart data={violationBreakdown} />
             ) : (
               <p className="text-gray-400 text-sm italic">No violations reported yet</p>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mt-6">
        <div className="col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-800">Recent Violations</h2>
            <Link to="/violations" className="text-sm text-primary font-medium hover:underline">View All →</Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Citizen</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vioLoading ? (
                  <tr><td colSpan="4" className="text-center py-8"><LoadingSpinner size="sm" /></td></tr>
                ) : recentViolations.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-gray-500">No recent violations</td></tr>
                ) : recentViolations.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{v.citizenId?.name}</td>
                    <td className="px-5 py-3 text-gray-600">{v.type.replace('_',' ')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${v.status === 'PENDING' ? 'bg-orange-100 text-orange-800' : v.status === 'FINE_ISSUED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                      {format(new Date(v.createdAt), 'dd MMM, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="col-span-1 card p-0 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-800">Top Citizens</h2>
            <p className="text-xs text-gray-500 mt-1">Highest points balance</p>
          </div>
          
          <div className="p-0 overflow-y-auto max-h-[300px]">
            {topCitizens?.length === 0 ? (
              <p className="p-5 text-center text-gray-500 text-sm">No citizens found</p>
            ) : topCitizens?.map((c, idx) => (
              <div key={c._id} className="flex items-center px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3" 
                     style={{ backgroundColor: idx === 0 ? '#fef08a' : idx === 1 ? '#e5e7eb' : idx === 2 ? '#fed7aa' : '#f3f4f6', 
                              color: idx === 0 ? '#854d0e' : idx === 1 ? '#374151' : idx === 2 ? '#9a3412' : '#6b7280' }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate text-sm">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.phone}</div>
                </div>
                <div className="font-bold text-primary text-sm whitespace-nowrap ml-3">
                  {c.pointsBalance} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
