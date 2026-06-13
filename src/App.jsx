import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { LayoutDashboard, Footprints, ClipboardList, Scale, Share2, Utensils, Stethoscope } from 'lucide-react';

import Balades from './pages/Balades';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Poids from './pages/Poids';
import PublicShare from './pages/PublicShare';
import Rations from './pages/Rations';
import Veterinaire from './pages/Veterinaire';

const Navbar = () => {
  const location = useLocation();
  const items = [
    { path: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
    { path: '/', label: 'Balades', icon: Footprints },
    { path: '/journal', label: 'Journal', icon: ClipboardList },
    { path: '/poids', label: 'Poids', icon: Scale },
    { path: '/partage', label: 'Partage', icon: Share2 },
    { path: '/rations', label: 'Rations', icon: Utensils },
    { path: '/veterinaire', label: 'Véto', icon: Stethoscope },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center text-[10px] ${active ? 'text-green-700' : 'text-gray-500'}`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen pb-16">
        <Routes>
          <Route path="/" element={<Balades />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/poids" element={<Poids />} />
          <Route path="/partage" element={<PublicShare />} />
          <Route path="/rations" element={<Rations />} />
          <Route path="/veterinaire" element={<Veterinaire />} />
        </Routes>
        <Navbar />
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}
