// filepath: dashboard/src/pages/SocietyVouchers.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getSocietyVouchers, fulfilSocietyVoucher } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function SocietyVouchers() {
  const { user } = useAuthStore();
  const [vouchers, setVouchers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fulfilment Modal state
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [fulfilNotes, setFulfilNotes] = useState("");
  const [isSubmittingFulfil, setIsSubmittingFulfil] = useState(false);
  const [fulfilError, setFulfilError] = useState(null);
  const [fulfilSuccess, setFulfilSuccess] = useState(null);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSocietyVouchers({
        status: statusFilter,
        search: searchTerm.trim() || undefined,
      });
      if (res.success && res.data) {
        setVouchers(res.data.vouchers || []);
      } else {
        setVouchers([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load society vouchers");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleOpenFulfil = (voucher) => {
    setSelectedVoucher(voucher);
    setFulfilNotes("");
    setFulfilError(null);
    setFulfilSuccess(null);
  };

  const handleCloseFulfil = () => {
    setSelectedVoucher(null);
    setFulfilNotes("");
    setFulfilError(null);
  };

  const handleConfirmFulfil = async (e) => {
    e.preventDefault();
    if (!selectedVoucher) return;
    setIsSubmittingFulfil(true);
    setFulfilError(null);

    try {
      const res = await fulfilSocietyVoucher(selectedVoucher.id || selectedVoucher._id, fulfilNotes);
      if (res.success && res.data) {
        setFulfilSuccess(`Voucher ${res.data.voucherCode} has been recorded as FULFILLED.`);
        // Update local list immediately
        setVouchers((prev) =>
          prev.map((v) =>
            (v.id || v._id) === (res.data.id || res.data._id)
              ? { ...v, ...res.data, status: "FULFILLED", effectiveStatus: "FULFILLED" }
              : v
          )
        );
        setTimeout(() => {
          handleCloseFulfil();
          setFulfilSuccess(null);
        }, 1500);
      } else {
        setFulfilError(res.message || "Failed to fulfil voucher");
      }
    } catch (err) {
      setFulfilError(err.response?.data?.message || err.message || "Fulfilment failed");
    } finally {
      setIsSubmittingFulfil(false);
    }
  };

  // Status counts for overview tabs
  const totalCount = vouchers.length;
  const issuedCount = vouchers.filter((v) => v.effectiveStatus === "ISSUED").length;
  const fulfilledCount = vouchers.filter((v) => v.effectiveStatus === "FULFILLED").length;
  const expiredCount = vouchers.filter((v) => v.effectiveStatus === "EXPIRED").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Society Rewards & Voucher Fulfilment
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Ward {user?.wardId || "N/A"}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              Pilot Demonstration
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Verify and record one-time demonstration fulfilment for pilot reward vouchers presented by approved societies in your ward.
          </p>
        </div>
        <button
          onClick={fetchVouchers}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors shadow-sm"
        >
          {isLoading ? (
            <span className="animate-spin mr-2">🔄</span>
          ) : (
            <span className="mr-2">🔄</span>
          )}
          Refresh
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Total Vouchers
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</div>
        </div>
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Active / Fulfillable
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{issuedCount}</div>
        </div>
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Fulfilled Records
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{fulfilledCount}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Expired
          </div>
          <div className="text-2xl font-bold text-gray-600 mt-1">{expiredCount}</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2">
          {["ALL", "ISSUED", "FULFILLED", "EXPIRED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === status
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "ALL"
                ? "All Vouchers"
                : status === "ISSUED"
                ? "Active (ISSUED)"
                : status}
            </button>
          ))}
        </div>

        {/* Voucher Code / Society Search */}
        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="Search by Voucher Code (e.g. GP-VOUCH)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent uppercase placeholder:normal-case font-mono text-xs"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={fetchVouchers} className="text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin text-2xl mb-2">🔄</div>
            <p className="text-sm">Loading ward vouchers...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <span className="text-4xl block mb-2">🎟️</span>
            <p className="font-semibold text-gray-700">No society vouchers found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm
                ? "No vouchers matched your search code in this ward."
                : statusFilter !== "ALL"
                ? `No ${statusFilter} vouchers found in Ward ${user?.wardId}.`
                : "No pilot rewards have been redeemed yet by societies in this ward."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Voucher Code</th>
                  <th className="px-6 py-3.5">Society & Representative</th>
                  <th className="px-6 py-3.5">Pilot Reward Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Issued / Expiry</th>
                  <th className="px-6 py-3.5">Fulfilment Record</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {vouchers.map((v) => {
                  const isIssued = v.effectiveStatus === "ISSUED";
                  const isFulfilled = v.effectiveStatus === "FULFILLED";
                  const isExpired = v.effectiveStatus === "EXPIRED";

                  return (
                    <tr key={v.id || v._id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Voucher Code */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded border border-slate-300 inline-block tracking-wider">
                          {v.voucherCode}
                        </div>
                      </td>

                      {/* Society Details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {v.societyId?.name || "Society"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Reg: {v.societyId?.registrationNumber || "N/A"}
                        </div>
                        <div className="text-xs text-gray-400">
                          Rep: {v.representativeId?.name} ({v.representativeId?.phone})
                        </div>
                      </td>

                      {/* Reward Details */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{v.rewardName}</div>
                        <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                          {v.pointsCost} society pts spent
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isFulfilled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            ✓ FULFILLED
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            ● EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                            ● ACTIVE (ISSUED)
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div>
                          Issued:{" "}
                          <span className="font-medium text-gray-700">
                            {new Date(v.issuedAt || v.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          Expires:{" "}
                          <span
                            className={`font-medium ${
                              isExpired ? "text-red-600 font-bold" : "text-gray-700"
                            }`}
                          >
                            {new Date(v.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Fulfilment Record */}
                      <td className="px-6 py-4 text-xs">
                        {isFulfilled ? (
                          <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-100">
                            <div className="font-semibold text-blue-900">
                              By: {v.fulfilledBy?.name || "Ward Officer"}
                            </div>
                            <div className="text-blue-700 text-[11px] mt-0.5">
                              {new Date(v.fulfilledAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {v.fulfilmentNotes && (
                              <div className="text-blue-800 italic mt-1 text-[11px] border-t border-blue-200 pt-1">
                                "{v.fulfilmentNotes}"
                              </div>
                            )}
                          </div>
                        ) : isExpired ? (
                          <span className="text-gray-400 italic text-xs">
                            Expired without fulfilment
                          </span>
                        ) : (
                          <span className="text-amber-600 text-xs font-medium">
                            Awaiting representative presentation
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        {isIssued ? (
                          <button
                            onClick={() => handleOpenFulfil(v)}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            ✓ Fulfil Voucher
                          </button>
                        ) : isFulfilled ? (
                          <span className="text-xs text-blue-700 font-medium">
                            Fulfilment Recorded
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not Fulfillable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fulfilment Confirmation Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-start justify-between border-b pb-3 border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Record Voucher Fulfilment
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  BMC GreenPoint Mumbai Pilot Demonstration
                </p>
              </div>
              <button
                onClick={handleCloseFulfil}
                disabled={isSubmittingFulfil}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Voucher Snapshot Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Voucher Code
                </span>
                <span className="font-mono font-extrabold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {selectedVoucher.voucherCode}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Society:</span>
                <span className="font-semibold text-slate-800">
                  {selectedVoucher.societyId?.name} (Ward {selectedVoucher.wardId})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Pilot Reward:</span>
                <span className="font-semibold text-slate-800">
                  {selectedVoucher.rewardName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Points Cost:</span>
                <span className="font-bold text-emerald-600">
                  {selectedVoucher.pointsCost} Points
                </span>
              </div>
            </div>

            {/* Disclaimer Alert */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
              ⚠️ <strong>Pilot Action:</strong> Recording fulfilment marks this demonstration voucher as fulfilled by you (Ward Officer {user?.name}). This action is final, executes server-side once, and does not deduct points again.
            </div>

            {/* Optional Fulfilment Notes */}
            <form onSubmit={handleConfirmFulfil} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fulfilment Verification Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={fulfilNotes}
                  onChange={(e) => setFulfilNotes(e.target.value)}
                  placeholder="e.g. Composting starter culture handed over to society representative at ward office."
                  className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmittingFulfil}
                />
              </div>

              {fulfilError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  ⚠️ {fulfilError}
                </div>
              )}

              {fulfilSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold">
                  ✓ {fulfilSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseFulfil}
                  disabled={isSubmittingFulfil}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFulfil}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingFulfil ? (
                    <>
                      <span className="animate-spin text-xs">🔄</span>
                      Recording...
                    </>
                  ) : (
                    "Confirm Fulfilment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
