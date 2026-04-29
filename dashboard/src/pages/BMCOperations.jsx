import React, { useState, useEffect } from "react";
import axios from "axios";

export default function BMCOperations() {
  const [stats, setStats] = useState({
    totalCollected: 0,
    collectorsActive: 0,
    pointsCovered: 0,
    pendingVerification: 0,
  });
  const [wardData, setWardData] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBMCStats();
  }, []);

  const fetchBMCStats = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch BMC collections summary
      const collectionsRes = await axios.get("/api/bmc-collections", {
        headers,
      });
      if (collectionsRes.data?.success) {
        const collections = collectionsRes.data.data.collections || [];
        const totalWeight = collections.reduce((sum, c) => sum + c.weight, 0);
        setStats((prev) => ({
          ...prev,
          totalCollected: totalWeight,
          pendingVerification: collections.filter((c) => c.status === "pending")
            .length,
        }));
      }

      // Fetch collection points
      const pointsRes = await axios.get("/api/collection-points/ward/N-WARD", {
        headers,
      });
      if (pointsRes.data?.success) {
        const points = pointsRes.data.data;
        const covered = points.filter((p) => p.lastCollectionAt).length;
        const activeCollectors = new Set(
          points.map((p) => p.assignedCollectorId).filter(Boolean),
        ).size;

        setStats((prev) => ({
          ...prev,
          pointsCovered: covered,
          collectorsActive: activeCollectors,
        }));

        // Group by collector
        const collectorMap = {};
        points.forEach((point) => {
          if (point.assignedCollectorId) {
            const collectorId =
              point.assignedCollectorId._id || point.assignedCollectorId;
            if (!collectorMap[collectorId]) {
              collectorMap[collectorId] = {
                id: collectorId,
                name: point.assignedCollectorId.name || "Unknown",
                phone: point.assignedCollectorId.phone || "-",
                pointsAssigned: 0,
                pointsCovered: 0,
                totalCollected: 0,
              };
            }
            collectorMap[collectorId].pointsAssigned++;
            if (point.lastCollectionAt) {
              collectorMap[collectorId].pointsCovered++;
            }
          }
        });

        setCollectors(Object.values(collectorMap));
      }

      // Group collections by waste type
      const collectionsRes2 = await axios.get("/api/bmc-collections/history", {
        headers,
      });
      if (collectionsRes2.data?.success) {
        // You can process ward-wise data here if needed
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch BMC stats:", err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          BMC Bulk Collection Operations
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor waste collection from societies and transfer points
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Total Weight Collected
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {Math.round(stats.totalCollected)}
              </p>
              <p className="text-gray-500 text-xs mt-2">kg today</p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Active Collectors
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.collectorsActive}
              </p>
              <p className="text-gray-500 text-xs mt-2">on duty</p>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Points Covered
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.pointsCovered}
              </p>
              <p className="text-gray-500 text-xs mt-2">collection points</p>
            </div>
            <div className="text-3xl">📍</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Pending Verification
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.pendingVerification}
              </p>
              <p className="text-gray-500 text-xs mt-2">entries</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>
      </div>

      {/* Collector Performance */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            BMC Collector Performance
          </h2>
        </div>

        {collectors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Collector Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Points Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Completed Today
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {collectors.map((collector) => {
                  const progress =
                    collector.pointsAssigned > 0
                      ? Math.round(
                          (collector.pointsCovered / collector.pointsAssigned) *
                            100,
                        )
                      : 0;

                  return (
                    <tr key={collector.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {collector.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {collector.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {collector.pointsAssigned}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          {collector.pointsCovered}/{collector.pointsAssigned}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-600 w-10">
                            {progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-600">No collectors assigned yet</p>
          </div>
        )}
      </div>

      {/* Waste Type Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Waste Types Collected
          </h3>
          <div className="space-y-3">
            {["Wet", "Dry", "Mixed", "Bulk"].map((type, idx) => (
              <div key={type} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: [
                      "#10b981",
                      "#8b5cf6",
                      "#f59e0b",
                      "#ef4444",
                    ][idx],
                  }}
                />
                <span className="text-sm text-gray-600">{type}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                <span className="text-sm font-medium text-gray-900">0%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Collection Points by Type
          </h3>
          <div className="space-y-3">
            {["Society", "Public Bin", "Transfer Station"].map((type, idx) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">0</span>
                  <span className="text-xs text-gray-500">points</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
