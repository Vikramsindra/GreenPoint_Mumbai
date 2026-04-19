// filepath: dashboard/src/components/CreateCampaignModal.jsx
import React, { useState } from 'react';

export default function CreateCampaignModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'QUIZ', bonusPoints: 25, 
    startDate: '', endDate: ''
  });
  
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctIndex: 0 }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    if (questions.length >= 5) return;
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    const q = [...questions];
    q.splice(idx, 1);
    setQuestions(q);
  };

  const updateQuestion = (idx, field, val, optIdx = null) => {
    const q = [...questions];
    if (field === 'options') {
      q[idx].options[optIdx] = val;
    } else {
      q[idx][field] = val;
    }
    setQuestions(q);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!form.startDate || !form.endDate) return setError('Dates are required');
    if (new Date(form.startDate) >= new Date(form.endDate)) return setError('End date must be after start date');
    
    if (form.type === 'QUIZ') {
      if (questions.length < 3) return setError('Quiz requires at least 3 questions');
      
      for (let i=0; i<questions.length; i++) {
        if (!questions[i].question.trim()) return setError(`Question ${i+1} is empty`);
        if (questions[i].options.some(o => !o.trim())) return setError(`All options in Question ${i+1} must be filled`);
      }
    }

    try {
      setIsLoading(true);
      const payload = { ...form, bonusPoints: Number(form.bonusPoints) };
      if (form.type === 'QUIZ') {
        payload.quizQuestions = questions;
      }
      await onCreated(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-2xl my-auto relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Campaign</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="label">Campaign Title</label>
              <input required type="text" className="input" placeholder="e.g. Plastic-Free Week Challenge" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea required className="input min-h-[80px]" placeholder="Brief explanation of the campaign..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>

            <div>
              <label className="label">Campaign Type</label>
              <select className="input bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="QUIZ">Quiz / Assessment</option>
                <option value="AWARENESS">Awareness Drive</option>
                <option value="CHALLENGE">Action Challenge</option>
              </select>
            </div>

            <div>
              <label className="label">Bonus Points Reward</label>
              <input required type="number" min="0" max="200" className="input" value={form.bonusPoints} onChange={e => setForm({...form, bonusPoints: e.target.value})} />
            </div>

            <div>
              <label className="label">Start Date</label>
              <input required type="date" className="input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            </div>
            
            <div>
              <label className="label">End Date</label>
              <input required type="date" className="input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
            </div>
          </div>

          {form.type === 'QUIZ' && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex justify-between flex-end mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Quiz Questions</h3>
                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{questions.length}/5 Questions</span>
              </div>
              
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 relative">
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-sm">✕</button>
                  )}
                  
                  <div className="mb-4 pr-6">
                    <label className="label text-xs">Question {qIdx + 1}</label>
                    <input required type="text" className="input" placeholder="Enter question text..." value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className={`flex items-center gap-2 p-2 border rounded-lg bg-white ${q.correctIndex === optIdx ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200'}`}>
                        <input 
                          type="radio" 
                          name={`correct-${qIdx}`} 
                          checked={q.correctIndex === optIdx} 
                          onChange={() => updateQuestion(qIdx, 'correctIndex', optIdx)}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 ml-1"
                        />
                        <div className="text-xs font-bold text-gray-400 w-4">{['A','B','C','D'][optIdx]}</div>
                        <input required type="text" className="text-sm outline-none w-full" placeholder={`Option ${optIdx+1}`} value={opt} onChange={e => updateQuestion(qIdx, 'options', e.target.value, optIdx)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {questions.length < 5 && (
                <button type="button" onClick={addQuestion} className="btn-secondary w-full border-dashed border-2 py-3 text-gray-500 hover:border-gray-400">
                  + Add Question
                </button>
              )}
            </div>
          )}

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary px-8">
              {isLoading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
