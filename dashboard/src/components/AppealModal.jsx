// filepath: dashboard/src/components/AppealModal.jsx
import React, { useState } from 'react';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';
import { format, parseISO } from 'date-fns';

export default function AppealModal({ violation, onClose, onResolve }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcomeVal, setOutcomeVal] = useState(null);

  if (!violation) return null;

  const handleResolve = async (outcome) => {
    setIsSubmitting(true);
    setOutcomeVal(outcome);
    try {
      await onResolve(outcome);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const formatType = (type) => type?.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const dateStr = format(parseISO(violation.createdAt), 'dd MMM yyyy, h:mm a');
  const appealDate = violation.appealSubmittedAt ? format(parseISO(violation.appealSubmittedAt), 'dd MMM yyyy, h:mm a') : 'Unknown';

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="max-w-lg w-full bg-white rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">Review Appeal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Citizen</p>
              <p className="font-semibold text-gray-900">{violation.citizenId?.name}</p>
              <p className="text-sm text-gray-600">{violation.citizenId?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Date Logged</p>
              <p className="text-sm text-gray-900 font-medium">{dateStr}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Violation Details</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-sm font-medium">{formatType(violation.type)}</span>
                <Badge status={`tier${violation.tier}`} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Penalty</p>
              {violation.fineAmount > 0 
                ? <p className="text-sm font-bold text-red-600">₹{violation.fineAmount} Fine</p>
                : <p className="text-sm font-bold text-orange-600">-{violation.pointsDeducted} Points</p>
              }
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Citizen's Appeal</h3>
            <span className="text-xs text-gray-500">{appealDate}</span>
          </div>
          
          <blockquote className="border-l-4 border-blue-400 pl-4 py-3 pr-3 bg-blue-50 text-gray-700 rounded-r-lg text-sm leading-relaxed italic shadow-inner">
            "{violation.appealText}"
          </blockquote>
          
          {violation.appealPhotoUrl && (
            <div className="mt-3">
              <a href={violation.appealPhotoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                <span>📎</span> View Attached Evidence Image
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
          <button 
            className="btn-danger flex items-center justify-center min-w-[140px]"
            onClick={() => handleResolve('UPHELD')}
            disabled={isSubmitting}
          >
            {isSubmitting && outcomeVal === 'UPHELD' ? <LoadingSpinner size="sm" /> : 'Uphold Violation'}
          </button>
          
          <button 
            className="btn-primary flex items-center justify-center min-w-[190px]"
            onClick={() => handleResolve('DISMISSED')}
            disabled={isSubmitting}
          >
            {isSubmitting && outcomeVal === 'DISMISSED' ? <LoadingSpinner size="sm" /> : 'Dismiss & Restore'}
          </button>
        </div>

      </div>
    </div>
  );
}
