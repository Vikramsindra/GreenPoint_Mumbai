// filepath: dashboard/src/pages/BMCOperations.jsx
import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

export default function BMCOperations() {
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState({
    totalWeight: 0,
    successfulHandovers: 0,
    distinctSocietiesCovered: 0,
    pendingReviewCount: 0,
    totalRecords: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [dateFilter, setDateFilter] = useState('today');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('verified');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    fetchCollections();
  }, [dateFilter, outcomeFilter, statusFilter, page]);

  const fetchCollections = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await api.getBmcCollectionsOfficer({
        date: dateFilter,
        outcome: outcomeFilter,
        status: statusFilter,
        page,
        limit
      });

      if (res?.success) {
        setCollections(res.data.collections || []);
        setSummary(res.data.summary || {
          totalWeight: 0,
          successfulHandovers: 0,
          distinctSocietiesCovered: 0,
          pendingReviewCount: 0,
          totalRecords: 0
        });
        setTotalPages(res.data.totalPages || 1);
      } else {
        setError(res?.message || 'Failed to load collections');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching BMC collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenReview = (pickup) => {
    setSelectedPickup(pickup);
    setReviewDecision('verified');
    setReviewNotes('');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedPickup) return;

    if (reviewDecision === 'rejected' && (!reviewNotes || reviewNotes.trim().length < 3)) {
      setReviewError('An explanatory note is required when rejecting a pickup (at least 3 characters)');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError('');

      const res = await api.reviewBmcCollection(selectedPickup._id, {
        status: reviewDecision,
        notes: reviewNotes.trim()
      });

      if (res?.success) {
        setSuccessToast(`Pickup marked as ${reviewDecision}.`);
        setTimeout(() => setSuccessToast(''), 4000);
        setReviewModalOpen(false);
        setSelectedPickup(null);
        fetchCollections(true);
      } else {
        setReviewError(res?.message || 'Failed to submit review');
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || 'Error submitting review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BMC Bulk Collection Operations</h1>
          <p className="text-xs text-gray-500 mt-1">
            Ward-scoped verification of municipal waste handovers from housing societies
          </p>
        </div>

        <button
          onClick={() => fetchCollections(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
        >
          <span className={`text-base ${refreshing ? 'animate-spin' : ''}`}>🔄</span> Refresh Data
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>✓ {successToast}</span>
          <button onClick={() => setSuccessToast('')} className="text-green-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchCollections(true)} className="underline text-red-700 ml-4">Retry</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm border-l-4 border-l-blue-600">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Collected Weight</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{summary.totalWeight} <span className="text-sm font-normal text-gray-500">kg</span></p>
          <p className="text-xs text-gray-500 mt-1">Excludes no-handover attempts</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm border-l-4 border-l-green-600">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Successful Handovers</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{summary.successfulHandovers}</p>
          <p className="text-xs text-gray-500 mt-1">Segregated and mixed pickups</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm border-l-4 border-l-purple-600">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Distinct Societies Covered</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">{summary.distinctSocietiesCovered}</p>
          <p className="text-xs text-gray-500 mt-1">From {summary.totalRecords} total handover records</p>
        </div>

        <div className="card p-5 bg-white border border-gray-200 rounded-xl shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Officer Review</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">{summary.pendingReviewCount}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting operational sign-off</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters:</span>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium"
          >
            <option value="today">Today (IST)</option>
            <option value="all">All Dates</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => { setOutcomeFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium"
          >
            <option value="">All Outcomes</option>
            <option value="SEGREGATED">Segregated ✓</option>
            <option value="MIXED">Mixed ⚠️</option>
            <option value="NO_HANDOVER">No Handover 🚪</option>
          </select>

          {/* Review Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium"
          >
            <option value="">All Review Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          Showing {collections.length} record(s) on page {page} of {totalPages}
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Society / Location</th>
                <th className="px-5 py-3.5">Collector</th>
                <th className="px-5 py-3.5 text-center">Outcome</th>
                <th className="px-5 py-3.5 text-center">Waste & Weight</th>
                <th className="px-5 py-3.5 text-center">Points Awarded</th>
                <th className="px-5 py-3.5 text-center">Review Status</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <LoadingSpinner size="md" text="Loading municipal collections..." />
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-500 text-sm">
                    No municipal collections found matching the selected filters.
                  </td>
                </tr>
              ) : (
                collections.map((item) => {
                  const isUnlinked = !item.societyId;
                  const isNoHandover = item.outcome === 'NO_HANDOVER';

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      {/* Society / Point */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">
                              {item.societyId?.name || item.collectionPointId?.name || 'Manual Collection Point'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {item.societyId?.address || item.collectionPointId?.address || 'Operational Entry'}
                            </p>
                            {isUnlinked && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                Manual Entry
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* BMC Collector */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 text-xs">
                          {item.bmcCollectorId?.name || 'BMC Collector'}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          {item.bmcCollectorId?.phone || '—'}
                        </p>
                      </td>

                      {/* Outcome Badge */}
                      <td className="px-5 py-3.5 text-center">
                        {item.outcome === 'SEGREGATED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            Segregated ✓
                          </span>
                        ) : item.outcome === 'MIXED' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Mixed ⚠️
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            No Handover 🚪
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-[11px] text-gray-500 mt-1 max-w-[140px] truncate mx-auto" title={item.notes}>
                            {item.notes}
                          </p>
                        )}
                      </td>

                      {/* Waste & Weight */}
                      <td className="px-5 py-3.5 text-center">
                        {isNoHandover ? (
                          <span className="text-xs text-gray-400">0 kg</span>
                        ) : (
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{item.weight} kg</span>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <span className="text-[10px] uppercase font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {item.wasteType}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                ({item.weightBasis || 'EST'})
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Points Awarded */}
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.pointsAwarded > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.pointsAwarded > 0 ? `+${item.pointsAwarded} pts` : '0 pts'}
                        </span>
                        {item.pointsReason && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px] mx-auto" title={item.pointsReason}>
                            {item.pointsReason}
                          </p>
                        )}
                      </td>

                      {/* Review Status */}
                      <td className="px-5 py-3.5 text-center">
                        {item.status === 'verified' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            ✓ Verified
                          </span>
                        ) : item.status === 'rejected' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200" title={item.verificationNotes}>
                            ✕ Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⏳ Pending
                          </span>
                        )}
                        {item.verifiedBy && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            by {item.verifiedBy.name}
                          </p>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {item.timestamp ? format(new Date(item.timestamp), 'dd MMM, HH:mm') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {item.status === 'pending' ? (
                          <button
                            onClick={() => handleOpenReview(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-sm transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
            <div>Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && selectedPickup && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Officer Pickup Review</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record an operational decision for this society handover
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Critical Policy Note */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg text-xs text-amber-900">
              <p className="font-bold">Demonstration Boundary Note:</p>
              <p className="mt-0.5">
                Review records an operational decision. It does not adjust previously awarded points in this demo.
              </p>
            </div>

            {/* Pickup Details Summary */}
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Society:</span>
                <span className="font-bold text-gray-900">
                  {selectedPickup.societyId?.name || selectedPickup.collectionPointId?.name || 'Manual'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Outcome:</span>
                <span className="font-bold text-gray-900">{selectedPickup.outcome}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Weight & Stream:</span>
                <span className="font-bold text-gray-900">{selectedPickup.weight} kg ({selectedPickup.wasteType})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Awarded Points:</span>
                <span className="font-bold text-emerald-700">{selectedPickup.pointsAwarded || 0} pts</span>
              </div>
            </div>

            {/* Decision Radio Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Review Decision</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('verified')}
                  className={`p-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    reviewDecision === 'verified'
                      ? 'border-green-600 bg-green-50 text-green-800 ring-2 ring-green-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✓ Mark Verified
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision('rejected')}
                  className={`p-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    reviewDecision === 'rejected'
                      ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✕ Mark Rejected
                </button>
              </div>
            </div>

            {/* Review Notes Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                Reviewer Notes {reviewDecision === 'rejected' && <span className="text-red-600">* (required for rejection)</span>}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewDecision === 'rejected' ? 'Explain reason for rejecting this pickup record (min 3 chars)...' : 'Optional notes regarding verification...'}
                rows={3}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {reviewError && (
              <p className="text-xs text-red-600 font-semibold">{reviewError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                disabled={reviewSubmitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                  reviewDecision === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {reviewSubmitting ? 'Submitting...' : `Confirm ${reviewDecision === 'rejected' ? 'Rejection' : 'Verification'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
