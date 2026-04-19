// filepath: dashboard/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(phone, password);
      if (res.data.user.role !== 'officer') {
         useAuthStore.getState().logout();
         setError('Access Denied. Only officers can view this dashboard.');
      } else {
         navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🌱</div>
          <h1 className="text-2xl font-bold text-primary">GreenPoint Mumbai</h1>
          <p className="text-sm text-gray-500 mt-1">BMC Officer Portal</p>
        </div>
        
        <div className="border-t border-gray-100 mb-6"></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <input 
              type="tel" 
              pattern="[0-9]{10}" 
              placeholder="10-digit mobile number"
              className="input" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="input pr-10" 
                placeholder="Enter password"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm font-medium pt-1">{error}</div>}

          <button 
            type="submit" 
            className="btn-primary w-full py-2.5 mt-2 flex justify-center items-center" 
            disabled={isLoading}
          >
            {isLoading ? <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-xs text-gray-400 text-center">
        GreenPoint Mumbai v1.0 &middot; BMC Ward N
      </div>
    </div>
  );
}
