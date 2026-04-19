// filepath: dashboard/src/pages/Households.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Households() {
  const [households, setHouseholds] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, neverScanned: 0 });
  const [loading, setLoading] = useState(true);
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [address, setAddress] = useState('');
  const [societyId, setSocietyId] = useState('');
  
  const [generatedQR, setGeneratedQR] = useState(null);
  const [viewQR, setViewQR] = useState(null);

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/households/all?limit=50');
      if (res.success) {
        const list = res.data.households;
        setHouseholds(list);
        setStats({
          total: list.length,
          active: list.filter(h => h.isActive).length,
          neverScanned: list.filter(h => h.totalScans === 0).length
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchCitizens = async () => {
    if (!searchQuery || searchQuery.length < 3) return;
    try {
      // Re-using the getCitizens endpoint, assuming it exists
      // If it doesn't, this would fail, but for the prototype we handle it
      const res = await api.get(`/dashboard/citizens?search=${searchQuery}`);
      if (res.success) {
        setSearchResults(res.data.citizens || res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async () => {
    if (!selectedCitizen || !address) return;
    try {
      const res = await api.post('/households/register', {
        citizenId: selectedCitizen._id,
        address,
        societyId
      });
      if (res.success) {
        setGeneratedQR(res.data.household);
        fetchHouseholds();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const showQRCode = (household) => {
    setViewQR(household);
  };

  const downloadQR = async (id, qrCodeStr) => {
    try {
      const res = await api.get(`/households/qr-image/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `greenpoint-qr-${qrCodeStr}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download QR');
    }
  };

  const deactivateHousehold = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this household?')) return;
    try {
      await api.patch(`/households/${id}/deactivate`);
      fetchHouseholds();
    } catch (err) {
      alert('Failed to deactivate');
    }
  };

  const resetModal = () => {
    setShowRegisterModal(false);
    setSelectedCitizen(null);
    setSearchQuery('');
    setSearchResults([]);
    setAddress('');
    setSocietyId('');
    setGeneratedQR(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Household Registry</h1>
        <button 
          onClick={() => setShowRegisterModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Register Household
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Registered</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Active Households</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">Never Scanned</p>
          <p className="text-3xl font-bold text-amber-600">{stats.neverScanned}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Address & Society</th>
                <th className="px-6 py-4 font-medium">Citizen</th>
                <th className="px-6 py-4 font-medium">QR Code</th>
                <th className="px-6 py-4 font-medium text-center">Total Scans</th>
                <th className="px-6 py-4 font-medium">Last Scanned</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center"><LoadingSpinner /></td></tr>
              ) : households.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-gray-500">No households registered</td></tr>
              ) : (
                households.map(hh => (
                  <tr key={hh._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 line-clamp-1">{hh.address}</p>
                      <p className="text-xs text-gray-500">{hh.societyId || 'No Society'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{hh.citizenId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{hh.citizenId?.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono bg-gray-100 text-gray-800">
                        {hh.qrCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${hh.totalScans > 10 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {hh.totalScans}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {hh.lastScannedAt ? new Date(hh.lastScannedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      {hh.isActive 
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => showQRCode(hh)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Show QR
                      </button>
                      {hh.isActive && (
                        <button 
                          onClick={() => deactivateHousehold(hh._id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium ml-2"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Register Household</h3>
              <button onClick={resetModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6">
              {generatedQR ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✓</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Registration Successful!</h4>
                  <p className="text-sm text-gray-500 mb-6">QR Code generated for {generatedQR.address}</p>
                  
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 mb-6 flex flex-col items-center">
                    <img src={generatedQR.qrImageUrl} alt="QR Code" className="w-48 h-48 mb-2" />
                    <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded text-gray-700">{generatedQR.qrCode}</span>
                  </div>
                  
                  <p className="text-xs text-amber-600 font-medium mb-6">Print and attach to household bin or door.</p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => downloadQR(generatedQR._id, generatedQR.qrCode)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
                    >
                      Download PNG
                    </button>
                    <button 
                      onClick={resetModal}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!selectedCitizen ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Find Citizen</label>
                      <div className="flex gap-2 mb-4">
                        <input 
                          type="text" 
                          placeholder="Search by name or phone..." 
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button 
                          onClick={searchCitizens}
                          className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Search
                        </button>
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {searchResults.map(c => (
                            <div 
                              key={c._id} 
                              className="p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                              onClick={() => setSelectedCitizen(c)}
                            >
                              <div>
                                <p className="font-medium text-sm text-gray-900">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.phone}</p>
                              </div>
                              <button className="text-xs font-medium text-blue-600 border border-blue-600 rounded px-2 py-1">
                                Select
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Selected Citizen</p>
                          <p className="text-sm font-bold text-gray-900">{selectedCitizen.name} <span className="text-gray-500 font-normal">({selectedCitizen.phone})</span></p>
                        </div>
                        <button onClick={() => setSelectedCitizen(null)} className="text-xs text-gray-500 hover:text-gray-700">Change</button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label>
                        <textarea 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          rows="3"
                          placeholder="Flat No, Building, Street, Area..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        ></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Society/Complex (Optional)</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                          value={societyId}
                          onChange={(e) => setSocietyId(e.target.value)}
                        >
                          <option value="">Select Society...</option>
                          <option value="SUNRISE-APT">Sunrise Apartments</option>
                          <option value="GREEN-VALLEY">Green Valley CHS</option>
                          <option value="SHIVAJI-NAGAR">Shivaji Nagar Chawl</option>
                          <option value="OTHER">Other / Independent House</option>
                        </select>
                      </div>
                      
                      <button 
                        onClick={handleRegister}
                        disabled={!address || address.length < 10}
                        className={`w-full py-2.5 rounded-lg font-medium mt-4 ${!address || address.length < 10 ? 'bg-gray-300 text-gray-500' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                      >
                        Generate QR & Register
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code View Modal */}
      {viewQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Household QR Code</h3>
              <button onClick={() => setViewQR(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            
            <div className="p-6 text-center">
              {/* Citizen Info */}
              <div className="mb-4">
                <p className="text-lg font-bold text-gray-900">{viewQR.citizenId?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{viewQR.citizenId?.phone}</p>
                <p className="text-sm text-gray-500 mt-1">{viewQR.address}</p>
              </div>

              {/* QR Code Image */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 mb-4 inline-block">
                {viewQR.qrImageUrl ? (
                  <img src={viewQR.qrImageUrl} alt="QR Code" className="w-52 h-52 mx-auto" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center bg-gray-50 rounded">
                    <p className="text-gray-400 text-sm">QR image not available</p>
                  </div>
                )}
              </div>

              {/* QR String */}
              <div className="bg-gray-50 rounded-lg px-4 py-2 mb-6">
                <span className="font-mono text-sm text-gray-700 select-all">{viewQR.qrCode}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => downloadQR(viewQR._id, viewQR.qrCode)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm"
                >
                  📥 Download PNG
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(viewQR.qrCode);
                    alert('QR code copied to clipboard!');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg font-medium text-sm"
                >
                  📋 Copy Code
                </button>
              </div>

              <p className="text-xs text-amber-600 font-medium mt-4">Print and attach to household bin or door.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
