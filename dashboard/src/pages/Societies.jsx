// filepath: dashboard/src/pages/Societies.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getSocieties,
  getSocietyDetails,
  reviewSociety,
  getSocietyQrData,
  downloadSocietyQrBlob,
  getUsers,
  assignBmcCollector
} from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function Societies() {
  const { user } = useAuthStore();
  const [societies, setSocieties] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected society modal state
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const [detailSociety, setDetailSociety] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Review form state
  const [reviewMode, setReviewMode] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLat, setReviewLat] = useState("");
  const [reviewLng, setReviewLng] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // QR preview state
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [isQrLoading, setIsQrLoading] = useState(false);

  // BMC Collector Assignment state
  const [wardBmcCollectors, setWardBmcCollectors] = useState([]);
  const [selectedBmcCollectorId, setSelectedBmcCollectorId] = useState("");
  const [isAssigningBmc, setIsAssigningBmc] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState(null);

  // Fetch societies
  const fetchSocieties = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSocieties({
        page,
        limit: pagination.limit,
        status: status || undefined
      });
      if (res.success) {
        setSocieties(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.message || "Failed to load societies");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Network error loading societies");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, pagination.limit]);

  useEffect(() => {
    fetchSocieties(1, statusFilter);
  }, [statusFilter]);

  // Load active BMC collectors in officer's ward
  useEffect(() => {
    const fetchBmcCollectors = async () => {
      try {
        const res = await getUsers({ role: 'bmc_collector' });
        if (res.success && res.data) {
          setWardBmcCollectors(res.data.filter(u => u.isActive !== false));
        }
      } catch (err) {
        console.error("Failed to load ward BMC collectors:", err);
      }
    };
    fetchBmcCollectors();
  }, []);

  // Open Society Detail Modal
  const handleOpenDetails = async (societyId) => {
    setSelectedSocietyId(societyId);
    setDetailSociety(null);
    setIsDetailLoading(true);
    setDetailError(null);
    setReviewMode(null);
    setReviewNote("");
    setReviewLat("");
    setReviewLng("");
    setReviewError(null);
    setQrDataUrl(null);
    setAssignmentMessage(null);
    setSelectedBmcCollectorId("");

    try {
      const res = await getSocietyDetails(societyId);
      if (res.success && res.data) {
        setDetailSociety(res.data);
        if (res.data.location?.lat != null) setReviewLat(res.data.location.lat.toString());
        if (res.data.location?.lng != null) setReviewLng(res.data.location.lng.toString());

        // Pre-select current BMC collector if assigned
        const currentCollector = res.data.collectionPointId?.assignedCollectorId?._id ||
          res.data.collectionPointId?.assignedCollectorId;
        if (currentCollector) {
          setSelectedBmcCollectorId(currentCollector.toString());
        }

        // If approved, load QR code
        if (res.data.registrationStatus === "APPROVED" && res.data.qrCode) {
          loadQrData(societyId);
        }
      } else {
        setDetailError(res.message || "Failed to load society details");
      }
    } catch (err) {
      setDetailError(err.response?.data?.message || err.message || "Failed to load society details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleAssignBmc = async () => {
    if (!selectedBmcCollectorId) {
      setAssignmentMessage({ type: 'error', text: 'Please select an active BMC collector' });
      return;
    }
    const pointId = detailSociety?.collectionPointId?._id || detailSociety?.collectionPointId;
    if (!pointId) {
      setAssignmentMessage({ type: 'error', text: 'Linked municipal collection point not found' });
      return;
    }

    setIsAssigningBmc(true);
    setAssignmentMessage(null);
    try {
      const res = await assignBmcCollector(pointId, selectedBmcCollectorId);
      if (res.success) {
        setAssignmentMessage({ type: 'success', text: 'BMC Collector successfully assigned to society collection point!' });
        // Refresh details and table
        const updated = await getSocietyDetails(detailSociety._id);
        if (updated.success) {
          setDetailSociety(updated.data);
        }
        fetchSocieties(pagination.page);
      } else {
        setAssignmentMessage({ type: 'error', text: res.message || 'Failed to assign BMC collector' });
      }
    } catch (err) {
      setAssignmentMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to assign BMC collector' });
    } finally {
      setIsAssigningBmc(false);
    }
  };

  const loadQrData = async (societyId) => {
    setIsQrLoading(true);
    try {
      const res = await getSocietyQrData(societyId);
      if (res.success && res.qrImageUrl) {
        setQrDataUrl(res.qrImageUrl);
      }
    } catch (err) {
      console.error("Failed to load QR preview:", err);
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleDownloadQr = async () => {
    if (!detailSociety) return;
    try {
      const res = await downloadSocietyQrBlob(detailSociety._id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "image/png" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `society-${detailSociety.name.replace(/\s+/g, "_")}-qr.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download QR code: " + (err.message || "Error"));
    }
  };

  // Submit Review
  const handleSubmitReview = async () => {
    setReviewError(null);
    if (!reviewMode) return;

    if (reviewMode === "REJECT" && (!reviewNote || reviewNote.trim().length < 5)) {
      setReviewError("A meaningful rejection reason is required (at least 5 characters).");
      return;
    }

    const payload = {
      decision: reviewMode === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewNote: reviewNote.trim()
    };

    if (reviewMode === "APPROVE") {
      const latNum = parseFloat(reviewLat);
      const lngNum = parseFloat(reviewLng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
          setReviewError("Coordinates out of range. Latitude [-90, 90], Longitude [-180, 180].");
          return;
        }
        payload.location = { lat: latNum, lng: lngNum };
      }
    }

    setIsSubmittingReview(true);
    try {
      const res = await reviewSociety(detailSociety._id, payload);
      if (res.success) {
        // Refresh detail view
        await handleOpenDetails(detailSociety._id);
        // Refresh table list
        fetchSocieties(pagination.page, statusFilter);
      } else {
        setReviewError(res.message || "Failed to process review");
      }
    } catch (err) {
      setReviewError(err.response?.data?.message || err.message || "Review submission failed");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏢</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Societies Onboarding</h1>
              <p className="text-sm text-gray-500">
                Review and approve residential society registrations and issue municipal waste collection QR identities
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Assigned Ward: {user?.wardId || "N-WARD"}
          </span>
          <button
            onClick={() => fetchSocieties(pagination.page)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            title="Refresh list"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { key: "", label: "All Applications" },
          { key: "PENDING", label: "Pending Review" },
          { key: "APPROVED", label: "Approved" },
          { key: "REJECTED", label: "Rejected" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPagination(p => ({ ...p, page: 1 }));
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSocieties(pagination.page)}
            className="text-xs font-semibold underline hover:text-rose-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Societies table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm">Loading society applications for Ward {user?.wardId}...</p>
          </div>
        ) : societies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <span className="text-4xl block mb-2">📋</span>
            <p className="text-base font-medium text-gray-700">No society applications found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} applications in Ward ${user?.wardId}.`
                : `No society applications submitted yet in Ward ${user?.wardId}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Society Name</th>
                  <th className="py-3.5 px-4">Ward & Address</th>
                  <th className="py-3.5 px-4">Representative</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">BMC Collector</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {societies.map((soc) => (
                  <tr key={soc._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <div>
                          <div>{soc.name}</div>
                          {soc.registrationNumber && (
                            <span className="text-xs text-gray-400 font-mono">Reg: {soc.registrationNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 max-w-xs truncate">
                      <div className="font-medium text-gray-800">{soc.wardId}</div>
                      <div className="text-xs text-gray-500 truncate" title={soc.address}>{soc.address}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-800">{soc.representativeId?.name || "N/A"}</div>
                      <div className="text-xs text-gray-500 font-mono">{soc.representativeId?.phone || ""}</div>
                    </td>
                    <td className="py-4 px-4">
                      {soc.registrationStatus === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending Review
                        </span>
                      )}
                      {soc.registrationStatus === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Approved
                        </span>
                      )}
                      {soc.registrationStatus === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {soc.registrationStatus === "APPROVED" ? (
                        soc.collectionPointId?.assignedCollectorId ? (
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">
                              {soc.collectionPointId.assignedCollectorId.name}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              ID: {soc.collectionPointId.assignedCollectorId.collectorId || soc.collectionPointId.assignedCollectorId.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {soc.submittedAt ? new Date(soc.submittedAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(soc._id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          soc.registrationStatus === "PENDING"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        {soc.registrationStatus === "PENDING" ? "Review Application" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!isLoading && societies.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div>
              Showing <span className="font-semibold">{societies.length}</span> of{" "}
              <span className="font-semibold">{pagination.total}</span> applications
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSocieties(pagination.page - 1)}
                className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                ← Previous
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSocieties(pagination.page + 1)}
                className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / Review Modal */}
      {selectedSocietyId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {detailSociety?.name || "Society Application"}
                  </h2>
                  <div className="text-xs text-gray-500">
                    Ward: <span className="font-semibold text-gray-700">{detailSociety?.wardId}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSocietyId(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {isDetailLoading ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
                  <p>Loading application details...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-200">
                  ⚠️ {detailError}
                </div>
              ) : detailSociety ? (
                <>
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Current Status
                      </div>
                      <div className="text-base font-bold mt-0.5">
                        {detailSociety.registrationStatus === "PENDING" && (
                          <span className="text-amber-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Awaiting Ward Officer Review
                          </span>
                        )}
                        {detailSociety.registrationStatus === "APPROVED" && (
                          <span className="text-emerald-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Approved & Active Collection Point Linked
                          </span>
                        )}
                        {detailSociety.registrationStatus === "REJECTED" && (
                          <span className="text-rose-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>Submitted: {new Date(detailSociety.submittedAt).toLocaleString()}</div>
                      {detailSociety.reviewedAt && (
                        <div>Reviewed: {new Date(detailSociety.reviewedAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>

                  {/* Society info grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Society Information</div>
                      <div className="space-y-1.5 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Full Name:</span>
                          <div className="font-medium text-gray-800">{detailSociety.name}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Address:</span>
                          <div className="font-medium text-gray-800">{detailSociety.address}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Registration Number:</span>
                          <div className="font-mono text-gray-800">{detailSociety.registrationNumber || "Not provided"}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">GPS Coordinates:</span>
                          <div className="font-mono text-gray-800">
                            {detailSociety.location?.lat != null
                              ? `${detailSociety.location.lat}, ${detailSociety.location.lng}`
                              : "Not provided at registration"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Representative Contact</div>
                      <div className="space-y-1.5 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Name:</span>
                          <div className="font-medium text-gray-800">{detailSociety.representativeId?.name || "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Phone:</span>
                          <div className="font-mono font-medium text-gray-800">{detailSociety.representativeId?.phone || "N/A"}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Email:</span>
                          <div className="font-medium text-gray-800">{detailSociety.representativeId?.email || "Not provided"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review notes / previous decision */}
                  {detailSociety.registrationStatus !== "PENDING" && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase">Review Decision Log</div>
                      <div className="text-sm">
                        <span className="text-gray-500 text-xs">Reviewed by:</span>{" "}
                        <span className="font-medium">{detailSociety.reviewedBy?.name || "Officer"}</span>
                      </div>
                      {detailSociety.reviewNote && (
                        <div className="text-sm">
                          <span className="text-gray-500 text-xs">Review Note / Reason:</span>
                          <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-gray-800 font-medium">
                            {detailSociety.reviewNote}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Approved QR Section */}
                  {detailSociety.registrationStatus === "APPROVED" && (
                    <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                            Official Society Collection QR Identity
                          </div>
                          <div className="text-xs text-emerald-600 mt-0.5">
                            Opaque municipal QR token issued for aggregate waste handovers
                          </div>
                        </div>
                        <span className="font-mono text-xs px-2.5 py-1 bg-white border border-emerald-300 rounded text-emerald-800 font-bold">
                          {detailSociety.qrCode}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-4 rounded-xl border border-emerald-100">
                        {isQrLoading ? (
                          <div className="w-36 h-36 flex items-center justify-center bg-gray-50 border rounded-lg">
                            <span className="animate-spin text-2xl">🔄</span>
                          </div>
                        ) : qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Society QR Code"
                            className="w-36 h-36 object-contain border border-gray-200 rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-36 h-36 flex items-center justify-center bg-gray-50 border rounded-lg text-xs text-gray-400 text-center p-2">
                            QR image available
                          </div>
                        )}

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <div className="text-sm font-semibold text-gray-900">
                            Linked Collection Point:
                          </div>
                          <div className="text-xs text-gray-600">
                            Point ID: <span className="font-mono">{detailSociety.collectionPointId?._id || detailSociety.collectionPointId}</span>
                          </div>
                          <button
                            onClick={handleDownloadQr}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors mt-2"
                          >
                            ⬇️ Download QR Image (PNG)
                          </button>
                        </div>
                      </div>

                      {/* BMC Collector Assignment Control */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                              Assigned BMC Municipal Collector
                            </div>
                            <div className="text-xs text-gray-500">
                              Responsible for municipal society aggregated waste pickups
                            </div>
                          </div>
                          {detailSociety.collectionPointId?.assignedCollectorId ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              ✓ Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠️ Unassigned
                            </span>
                          )}
                        </div>

                        {detailSociety.collectionPointId?.assignedCollectorId && (
                          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {detailSociety.collectionPointId.assignedCollectorId.name}
                              </div>
                              <div className="text-xs text-gray-600 font-mono mt-0.5">
                                Collector ID: {detailSociety.collectionPointId.assignedCollectorId.collectorId || "N/A"} • Phone: {detailSociety.collectionPointId.assignedCollectorId.phone}
                              </div>
                            </div>
                          </div>
                        )}

                        {assignmentMessage && (
                          <div
                            className={`p-3 rounded-lg text-xs font-medium border ${
                              assignmentMessage.type === "success"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {assignmentMessage.text}
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={selectedBmcCollectorId}
                            onChange={(e) => setSelectedBmcCollectorId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                          >
                            <option value="">-- Select Active BMC Collector in Ward {user?.wardId} --</option>
                            {wardBmcCollectors.map((col) => (
                              <option key={col._id} value={col._id}>
                                {col.name} ({col.collectorId || col.phone})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleAssignBmc}
                            disabled={isAssigningBmc || !selectedBmcCollectorId}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
                          >
                            {isAssigningBmc ? "Assigning..." : "Assign BMC Collector"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Decision Controls */}
                  {detailSociety.registrationStatus === "PENDING" && (
                    <div className="border-t border-gray-200 pt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-900">Officer Action</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setReviewMode("APPROVE");
                              setReviewError(null);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                              reviewMode === "APPROVE"
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-500 shadow-sm"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            ✓ Approve Society
                          </button>
                          <button
                            onClick={() => {
                              setReviewMode("REJECT");
                              setReviewError(null);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                              reviewMode === "REJECT"
                                ? "bg-rose-600 text-white ring-2 ring-rose-500 shadow-sm"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                            }`}
                          >
                            ✕ Reject Society
                          </button>
                        </div>
                      </div>

                      {reviewError && (
                        <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium">
                          ⚠️ {reviewError}
                        </div>
                      )}

                      {/* Approval form panel */}
                      {reviewMode === "APPROVE" && (
                        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                          <div className="text-xs font-bold text-emerald-900">
                            Confirm Approval for {detailSociety.name}
                          </div>
                          <p className="text-xs text-gray-600">
                            Approving will create a canonical CollectionPoint for this society and issue a unique, stable Society QR identity.
                          </p>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Optional Officer Note
                            </label>
                            <input
                              type="text"
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="e.g. Verified society address and representative identity"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-emerald-500 focus:border-emerald-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Optional Latitude
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={reviewLat}
                                onChange={(e) => setReviewLat(e.target.value)}
                                placeholder="e.g. 19.1136"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Optional Longitude
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={reviewLng}
                                onChange={(e) => setReviewLng(e.target.value)}
                                placeholder="e.g. 72.8697"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setReviewMode(null)}
                              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                            >
                              {isSubmittingReview ? "Approving..." : "Confirm & Issue Society QR"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Rejection form panel */}
                      {reviewMode === "REJECT" && (
                        <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                          <div className="text-xs font-bold text-rose-900">
                            Reject Application for {detailSociety.name}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Rejection Reason * (minimum 5 characters)
                            </label>
                            <textarea
                              rows={3}
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="Explain why this society application cannot be approved (e.g. Incomplete address, duplicate society entry)..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-rose-500 focus:border-rose-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setReviewMode(null)}
                              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                            >
                              {isSubmittingReview ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSelectedSocietyId(null)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
