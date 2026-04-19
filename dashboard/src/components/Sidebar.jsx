// filepath: dashboard/src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  const links = [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/violations', label: 'Violations', icon: '⚠️' },
    { to: '/citizens', label: 'Citizens', icon: '👥' },
    { to: '/campaigns', label: 'Campaigns', icon: '📢' }
  ];

  const getInitials = (name) => {
    if (!name) return 'O';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <aside className="w-60 fixed left-0 top-0 h-full bg-gray-800 text-white flex flex-col z-20">
      
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🌱</span>
          <span className="text-base font-bold tracking-tight">GreenPoint</span>
        </div>
        <div className="text-xs text-gray-400">BMC Dashboard</div>
      </div>
      
      <div className="border-t border-gray-700 mx-4 mb-4"></div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span className="text-lg opacity-90">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="border-t border-gray-700 mb-4"></div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-sm font-bold">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name || 'Officer'}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role || 'Officer'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-4 text-xs text-gray-400 hover:text-white transition-colors w-full text-left"
        >
          → Logout
        </button>
      </div>

    </aside>
  );
}
