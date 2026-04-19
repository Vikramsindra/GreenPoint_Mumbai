// filepath: dashboard/src/components/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 w-full relative overflow-y-auto min-h-screen p-8 ml-60">
        <Outlet />
      </main>
    </div>
  );
}
