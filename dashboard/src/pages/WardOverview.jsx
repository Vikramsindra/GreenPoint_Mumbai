// filepath: dashboard/src/pages/WardOverview.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../components/StatCard';
import ComplianceChart from '../components/ComplianceChart';
import LoadingSpinner from '../components/LoadingSpinner';
import * as api from '../services/api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function WardOverview() {
  const [secondsAgo, setSecondsAgo] = useState(0);

  const { data: res, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
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
      setSecondsAgo(Math.floor((Date.now() - (dataUpdatedAt || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [dataUpdatedAt]);

  if (isLoading && !res) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading ward dashboard..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mt-10">
        <p className="text-red-700 font-medium mb-4">Failed to load dashboard data. Please check your connection.</p>
        <button onClick={() => refetch()} className="btn-danger px-4 py-2 bg-red-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  const stats = res?.data || {};
  const recentViolations = vioRes?.data || [];

  const {
    wardId = 'N-WARD',
    istBusinessDate,
    approvedSocieties = 0,
    pendingSocieties = 0,
    approvedHouseholds = 0,
    inspectedHouseholdsToday = 0,
    segregatedHouseholdsToday = 0,
    mixedHouseholdsToday = 0,
    noHandoverHouseholdsToday = 0,
    actualHouseholdHandoversToday = 0,
    householdSegregationRate = null,
    municipalHandoverRecordsToday = 0,
    successfulMunicipalHandoversToday = 0,
    distinctSocietiesMunicipalToday = 0,
    municipalCollectedWeightToday = 0,
    unlinkedMunicipalPickupsToday = 0,
    pendingReviewPickups = 0,
    societyPointsEarnedToday = 0,
    societyPointsRedeemedToday = 0,
    outstandingSocietyPointsBalance = 0,
    vouchersAwaitingFulfilment = 0,
    vouchersFulfilled = 0,
    dailyTrend = []
  } = stats;

  const segregationDisplay = householdSegregationRate !== null ? `${householdSegregationRate}%` : 'No data';
  const segregationColor = householdSegregationRate === null ? 'amber' : householdSegregationRate >= 70 ? 'green' : householdSegregationRate >= 50 ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Ward {wardId} Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              IST Date: {istBusinessDate || format(new Date(), 'yyyy-MM-dd')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Last updated {secondsAgo}s ago {isFetching && <span className="text-blue-600 font-medium">(refreshing...)</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <span className={`text-base ${isFetching ? 'animate-spin' : ''}`}>🔄</span> Refresh
          </button>
          <div className="text-sm text-gray-600 font-medium bg-white px-3.5 py-2 rounded-lg border border-gray-200 shadow-sm">
            {format(new Date(), 'EEE, dd MMM yyyy')}
          </div>
        </div>
      </div>

      {/* Connected Monitoring Policy Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <p className="text-sm font-bold text-emerald-900">Connected Demonstration Monitoring</p>
            <p className="text-xs text-emerald-700">
              Internal society collectors inspect household handovers (recording participation). BMC collectors verify aggregated society pickups (earning society points).
            </p>
          </div>
        </div>
        <Link to="/bmc-operations" className="text-xs font-bold text-emerald-800 hover:underline whitespace-nowrap ml-4">
          BMC Operations →
        </Link>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Household Inspections Today"
          value={inspectedHouseholdsToday.toLocaleString()}
          color="green"
          icon="📋"
          unit={`(${segregatedHouseholdsToday} ✓ / ${mixedHouseholdsToday} ⚠️)`}
        />
        <StatCard
          title="Household Segregation Rate"
          value={segregationDisplay}
          color={segregationColor}
          icon="🎯"
          unit={householdSegregationRate !== null ? 'segregated' : ''}
          change={actualHouseholdHandoversToday > 0 ? `${segregatedHouseholdsToday}/${actualHouseholdHandoversToday} handovers` : undefined}
        />
        <StatCard
          title="Municipal Pickups Today"
          value={successfulMunicipalHandoversToday.toLocaleString()}
          color="blue"
          icon="🚛"
          unit={`in ${distinctSocietiesMunicipalToday} soc.`}
          change={`${municipalCollectedWeightToday} kg collected`}
        />
        <StatCard
          title="Vouchers Awaiting Fulfilment"
          value={vouchersAwaitingFulfilment.toLocaleString()}
          color={vouchersAwaitingFulfilment > 0 ? 'amber' : 'green'}
          icon="🎟️"
          unit={`(${vouchersFulfilled} fulfilled)`}
        />
      </div>

      {/* Secondary Operational Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Society & Household Coverage */}
        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800">Housing Societies in Ward</h3>
            <Link to="/societies" className="text-xs font-semibold text-blue-600 hover:underline">View All →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium">Approved Societies</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{approvedSocieties}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{pendingSocieties}</p>
            </div>
          </div>
          <div className="pt-1 flex justify-between text-xs text-gray-600">
            <span>Approved Member Households:</span>
            <span className="font-bold text-gray-900">{approvedHouseholds}</span>
          </div>
        </div>

        {/* Card 2: Municipal Pickup Breakdown */}
        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800">Municipal Pickup Breakdown</h3>
            <Link to="/bmc-operations" className="text-xs font-semibold text-blue-600 hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <p className="text-[11px] text-green-700 font-medium">Segregated</p>
              <p className="text-xl font-bold text-green-800 mt-1">{stats.segregatedMunicipalPickupsToday || 0}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <p className="text-[11px] text-amber-700 font-medium">Mixed</p>
              <p className="text-xl font-bold text-amber-800 mt-1">{stats.mixedMunicipalPickupsToday || 0}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <p className="text-[11px] text-gray-600 font-medium">No Handover</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{stats.noHandoverMunicipalAttemptsToday || 0}</p>
            </div>
          </div>
          <div className="pt-1 flex justify-between text-xs text-gray-600">
            <span>Pending Officer Review:</span>
            <span className={`font-bold ${pendingReviewPickups > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{pendingReviewPickups} pickups</span>
          </div>
        </div>

        {/* Card 3: Society Rewards Wallet */}
        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h3 className="text-sm font-bold text-gray-800">Society Rewards & Wallets</h3>
            <Link to="/society-vouchers" className="text-xs font-semibold text-blue-600 hover:underline">Vouchers →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 font-medium">Points Earned Today</p>
              <p className="text-xl font-bold text-green-800 mt-1">+{societyPointsEarnedToday}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">Points Redeemed</p>
              <p className="text-xl font-bold text-blue-800 mt-1">-{societyPointsRedeemedToday}</p>
            </div>
          </div>
          <div className="pt-1 flex justify-between text-xs text-gray-600">
            <span>Total Societies Point Balance:</span>
            <span className="font-bold text-gray-900">{outstandingSocietyPointsBalance} pts</span>
          </div>
        </div>
      </div>

      {/* Charts & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">7-Day Household Inspection Trend</h2>
              <p className="text-xs text-gray-500">Structured inspections recorded by internal society collectors</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded font-medium">
              Daily Inspections
            </span>
          </div>
          <ComplianceChart data={dailyTrend} />
        </div>

        {/* Operational Roles & Audits Quick Summary */}
        <div className="lg:col-span-1 card p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-gray-900">Ward Operations Audit</h2>
              <Link to="/collector-audit" className="text-xs text-blue-600 font-semibold hover:underline">
                Audit Details →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Internal Collectors</p>
                    <p className="text-[11px] text-gray-500">Inspect household segregation</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {inspectedHouseholdsToday} / {approvedHouseholds}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚛</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Municipal Collectors</p>
                    <p className="text-[11px] text-gray-500">Aggregate society handovers</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {distinctSocietiesMunicipalToday} / {approvedSocieties}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎟️</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Society Rewards</p>
                    <p className="text-[11px] text-gray-500">Pilot voucher redemptions</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-700">
                  {vouchersAwaitingFulfilment} pending
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            All counts are strictly bounded to <strong>Ward {wardId}</strong> and calculated in Indian Standard Time (Asia/Kolkata).
          </div>
        </div>
      </div>

      {/* Historical Violations Table (Preserved Read-Only Log) */}
      <div className="card p-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Historical Pilot & Legacy Violations</h2>
            <p className="text-xs text-gray-500">Automated fines disabled; observation logs preserved for audit.</p>
          </div>
          <Link to="/violations" className="text-xs text-blue-600 font-semibold hover:underline">
            View All Historical Records →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200">
              <tr>
                <th className="px-5 py-3">Citizen</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vioLoading ? (
                <tr><td colSpan="4" className="text-center py-6"><LoadingSpinner size="sm" /></td></tr>
              ) : recentViolations.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-6 text-gray-500 text-xs">No historical violations in this ward</td></tr>
              ) : recentViolations.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{v.citizenId?.name || 'Citizen'}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs font-mono">{v.type?.replace('_', ' ')}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">
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
    </div>
  );
}
