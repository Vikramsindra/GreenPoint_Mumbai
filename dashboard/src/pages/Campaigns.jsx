// filepath: dashboard/src/pages/Campaigns.jsx
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import CreateCampaignModal from '../components/CreateCampaignModal';
import Badge from '../components/Badge';
import { format, parseISO } from 'date-fns';

export default function Campaigns() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: api.getCampaigns,
  });

  const campaigns = res?.data || [];

  const handleDeactivate = async (id) => {
    if(!window.confirm("Are you sure you want to end this campaign early?")) return;
    try {
      await api.deactivateCampaign(id);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast("Campaign deactivated successfully");
    } catch(e) {
      alert("Failed to deactivate");
    }
  };

  const handleCreated = async (campaignData) => {
    await api.createCampaign(campaignData);
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    showToast("Campaign created successfully");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and monitor civic awareness drives</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateModal(true)}>
          <span className="text-lg">+</span> Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 text-center py-12 text-gray-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <span className="text-4xl block mb-3">📢</span>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Campaigns</h3>
            <p className="text-gray-500 text-sm mb-4">Start a new quiz or awareness drive to engage citizens.</p>
            <button className="btn-secondary" onClick={() => setShowCreateModal(true)}>Create First Campaign</button>
          </div>
        ) : (
          campaigns.map(c => {
            const isEnded = !c.isActive || new Date() > new Date(c.endDate);
            return (
              <div key={c._id} className={`card p-6 flex flex-col relative overflow-hidden ${isEnded ? 'bg-gray-50' : 'bg-white'}`}>
                {isEnded && <div className="absolute top-0 right-0 w-32 bg-gray-200 text-gray-600 text-[10px] font-bold text-center py-1 uppercase tracking-wider transform rotate-45 translate-x-10 translate-y-4">Ended</div>}
                
                <div className="flex items-start justify-between mb-3 pr-8">
                  <h3 className={`text-lg font-bold ${isEnded ? 'text-gray-600' : 'text-gray-900'} leading-tight`}>{c.title}</h3>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Badge status={c.type === 'QUIZ' ? 'APPEALED' : c.type === 'AWARENESS' ? 'PENDING' : 'active'} />
                  {!isEnded && <Badge status="active" />}
                </div>

                <p className="text-sm text-gray-600 mb-5 line-clamp-2 min-h-[40px]">{c.description}</p>
                
                <div className="mt-auto">
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Reward</div>
                      <div className="font-bold text-sm text-primary">+{c.bonusPoints} pts</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Engaged</div>
                      <div className="font-bold text-sm text-gray-800">{c.participantCount?.toLocaleString()}</div>
                    </div>
                    {c.type === 'QUIZ' && (
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Questions</div>
                        <div className="font-bold text-sm text-gray-800">{c.quizQuestions?.length}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">
                       {format(parseISO(c.startDate), 'dd MMM')} – {format(parseISO(c.endDate), 'dd MMM yyyy')}
                    </div>
                    {!isEnded ? (
                      <button className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors whitespace-nowrap bg-white border border-red-200" onClick={() => handleDeactivate(c._id)}>
                        End Early
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded whitespace-nowrap">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCreateModal && <CreateCampaignModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-50 text-green-800 border fill-green-600 border-green-200 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-50">
          <span className="text-xl">✅</span>
          <span className="font-semibold">{toast}</span>
        </div>
      )}
    </div>
  );
}
