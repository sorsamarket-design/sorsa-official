import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import BrandLogin from './pages/BrandLogin';
import BrandRegister from './pages/BrandRegister';
import CreatorLogin from './pages/CreatorLogin';
import BrandDashboard from './pages/BrandDashboard';
import BrandProfiles from './pages/BrandProfiles';
import BrandProfileNew from './pages/BrandProfileNew';
import BrandCampaigns from './pages/BrandCampaigns';
import CampaignNew from './pages/CampaignNew';
import CampaignBudget from './pages/CampaignBudget';
import CampaignDetail from './pages/CampaignDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminApprovals from './pages/AdminApprovals';
import CreatorDashboard from './pages/CreatorDashboard';
import CreatorProfile from './pages/CreatorProfile';
import CreatorBrowse from './pages/CreatorBrowse';
import CreatorCampaignDetail from './pages/CreatorCampaignDetail';
import ActiveCampaigns from './pages/ActiveCampaigns';
import ActiveCampaignDetail from './pages/ActiveCampaignDetail';
import Leaderboard from './pages/Leaderboard';
import BrandWallet from './pages/BrandWallet';
import BrandSettings from './pages/BrandSettings';
import CreatorWallet from './pages/CreatorWallet';
import Contact from './pages/Contact';
import CreatorSettings from './pages/CreatorSettings';
import CreatorReferral from './pages/CreatorReferral';
import PublicProfile from './pages/PublicProfile';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallback from './pages/AuthCallback';
import BrandAuthCallback from './pages/BrandAuthCallback';

export default function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/brand" element={<BrandLogin />} />
        <Route path="/auth/brand/register" element={<BrandRegister />} />
        <Route path="/auth/creator" element={<CreatorLogin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/callback/brand" element={<BrandAuthCallback />} />
        
        {/* Brand Routes */}
        <Route path="/brand/dashboard" element={<ProtectedRoute requiredRole="brand"><BrandDashboard /></ProtectedRoute>} />
        <Route path="/brand/profiles" element={<ProtectedRoute requiredRole="brand"><BrandProfiles /></ProtectedRoute>} />
        <Route path="/brand/profiles/new" element={<ProtectedRoute requiredRole="brand"><BrandProfileNew /></ProtectedRoute>} />
        <Route path="/brand/campaigns" element={<ProtectedRoute requiredRole="brand"><BrandCampaigns /></ProtectedRoute>} />
        <Route path="/brand/campaigns/new" element={<ProtectedRoute requiredRole="brand"><CampaignNew /></ProtectedRoute>} />
        <Route path="/brand/campaigns/new/budget" element={<ProtectedRoute requiredRole="brand"><CampaignBudget /></ProtectedRoute>} />
        <Route path="/brand/campaigns/:id" element={<ProtectedRoute requiredRole="brand"><CampaignDetail /></ProtectedRoute>} />
        <Route path="/brand/wallet" element={<ProtectedRoute requiredRole="brand"><BrandWallet /></ProtectedRoute>} />
        <Route path="/brand/settings" element={<ProtectedRoute requiredRole="brand"><BrandSettings /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/campaigns" element={<ProtectedRoute><AdminCampaigns /></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute><AdminApprovals /></ProtectedRoute>} />

        {/* Creator Routes */}
        <Route path="/creator/dashboard" element={<ProtectedRoute requiredRole="creator"><CreatorDashboard /></ProtectedRoute>} />
        <Route path="/creator/profile" element={<ProtectedRoute requiredRole="creator"><CreatorProfile /></ProtectedRoute>} />
        <Route path="/creator/campaigns" element={<ProtectedRoute requiredRole="creator"><CreatorBrowse /></ProtectedRoute>} />
        <Route path="/creator/campaigns/:id" element={<ProtectedRoute requiredRole="creator"><CreatorCampaignDetail /></ProtectedRoute>} />
        <Route path="/creator/active" element={<ProtectedRoute requiredRole="creator"><ActiveCampaigns /></ProtectedRoute>} />
        <Route path="/creator/active/:id" element={<ProtectedRoute requiredRole="creator"><ActiveCampaignDetail /></ProtectedRoute>} />
        <Route path="/creator/leaderboard" element={<ProtectedRoute requiredRole="creator"><Leaderboard /></ProtectedRoute>} />
        <Route path="/creator/wallet" element={<ProtectedRoute requiredRole="creator"><CreatorWallet /></ProtectedRoute>} />
        <Route path="/creator/referral" element={<ProtectedRoute requiredRole="creator"><CreatorReferral /></ProtectedRoute>} />
        <Route path="/creator/contact" element={<ProtectedRoute requiredRole="creator"><Contact /></ProtectedRoute>} />
        <Route path="/creator/settings" element={<ProtectedRoute requiredRole="creator"><CreatorSettings /></ProtectedRoute>} />
        
        {/* Public Routes */}
        <Route path="/profile/:handle" element={<PublicProfile />} />

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
