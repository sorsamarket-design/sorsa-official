import React from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
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
import AdminRaffles from './pages/AdminRaffles';
import AdminNFTCampaignNew from './pages/AdminNFTCampaignNew';
import AdminNFTApprovals from './pages/AdminNFTApprovals';
import AdminNFTSubmissions from './pages/AdminNFTSubmissions';
import AdminApprovals from './pages/AdminApprovals';
import AdminTickets from './pages/AdminTickets';
import AdminBotConfiguration from './pages/AdminBotConfiguration';
import AdminLogin from './pages/AdminLogin';
import CreatorProfile from './pages/CreatorProfile';
import CreatorBrowse from './pages/CreatorBrowse';
import CreatorCampaignDetail from './pages/CreatorCampaignDetail';
import CreatorNFTCampaigns from './pages/CreatorNFTCampaigns';
import CreatorNFTCampaignDetail from './pages/CreatorNFTCampaignDetail';
import ActiveCampaigns from './pages/ActiveCampaigns';
import ActiveCampaignDetail from './pages/ActiveCampaignDetail';
import Leaderboard from './pages/Leaderboard';
import BrandWallet from './pages/BrandWallet';
import BrandSettings from './pages/BrandSettings';
import CreatorWallet from './pages/CreatorWallet';
import Contact from './pages/Contact';
import CreatorSettings from './pages/CreatorSettings';
import CreatorReferral from './pages/CreatorReferral';
import ReferralLanding from './pages/ReferralLanding';
import PublicProfile from './pages/PublicProfile';
import Docs from './pages/Docs';
import LegalPage from './pages/LegalPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import AuthCallback from './pages/AuthCallback';
import BrandAuthCallback from './pages/BrandAuthCallback';
import { useAuth } from './context/AuthContext';
import AppLoadingScreen from './components/AppLoadingScreen';

function CampaignsRedirect() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!session) return <Navigate to="/login" replace />;
  if (role === 'brand') return <Navigate to="/brand/campaigns" replace />;
  if (role === 'creator') return <Navigate to="/creator/campaigns" replace />;

  return <div className="min-h-screen flex items-center justify-center bg-[#0B0A0F] text-red-400">Error</div>;
}

function RouteLayout() {
  const location = useLocation();
  const isBrandRoute = location.pathname.startsWith('/brand/');
  const isCreatorRoute = location.pathname.startsWith('/creator/');
  const isAdminRoute = location.pathname.startsWith('/admin/');

  const routeFrameClassName = isBrandRoute
    ? 'workspace-route-frame workspace-route-frame--brand'
    : isCreatorRoute || isAdminRoute
      ? 'workspace-route-frame'
      : undefined;

  return (
    <div className={routeFrameClassName}>
      {/* Paints the strip behind the iOS status bar while scrolled - see
          .statusbar-cap in index.css for why this must be a sticky element
          in the scroll flow rather than part of the fixed topbars. */}
      <div aria-hidden="true" className="statusbar-cap" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/brand" element={<BrandLogin />} />
        <Route path="/auth/brand/register" element={<BrandRegister />} />
        <Route path="/auth/admin" element={<AdminLogin />} />
        <Route path="/auth/creator" element={<CreatorLogin />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/callback/brand" element={<BrandAuthCallback />} />
        <Route path="/campaigns" element={<CampaignsRedirect />} />
        <Route path="/campaigns/:code" element={<ProtectedRoute requiredRole="creator"><CreatorNFTCampaignDetail /></ProtectedRoute>} />
        <Route path="/c/:code" element={<ProtectedRoute requiredRole="creator"><CreatorNFTCampaignDetail /></ProtectedRoute>} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/cookies" element={<LegalPage type="cookies" />} />
        <Route path="/join" element={<ReferralLanding />} />
        
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
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/campaigns" element={<ProtectedRoute requiredRole="admin"><AdminCampaigns /></ProtectedRoute>} />
        <Route path="/admin/raffles" element={<ProtectedRoute requiredRole="admin"><AdminRaffles /></ProtectedRoute>} />
        <Route path="/admin/raffles/:id" element={<ProtectedRoute requiredRole="admin"><AdminRaffles /></ProtectedRoute>} />
        <Route path="/admin/campaigns/new" element={<ProtectedRoute requiredRole="admin"><AdminNFTCampaignNew /></ProtectedRoute>} />
        <Route path="/admin/bot-configuration" element={<ProtectedRoute requiredRole="admin"><AdminBotConfiguration /></ProtectedRoute>} />
        <Route path="/admin/approvals" element={<ProtectedRoute requiredRole="admin"><AdminApprovals /></ProtectedRoute>} />
        <Route path="/admin/nft-approvals" element={<ProtectedRoute requiredRole="admin"><AdminNFTApprovals /></ProtectedRoute>} />
        <Route path="/admin/nft-submissions" element={<ProtectedRoute requiredRole="admin"><AdminNFTSubmissions /></ProtectedRoute>} />
        <Route path="/admin/nft-submissions/:id" element={<ProtectedRoute requiredRole="admin"><AdminNFTSubmissions /></ProtectedRoute>} />
        <Route path="/admin/tickets" element={<ProtectedRoute requiredRole="admin"><AdminTickets /></ProtectedRoute>} />

        {/* Creator Routes */}
        <Route path="/creator/profile" element={<ProtectedRoute requiredRole="creator"><CreatorProfile /></ProtectedRoute>} />
        <Route path="/creator/campaigns" element={<ProtectedRoute requiredRole="creator"><CreatorBrowse /></ProtectedRoute>} />
        <Route path="/creator/campaigns/:id" element={<ProtectedRoute requiredRole="creator"><CreatorCampaignDetail /></ProtectedRoute>} />
        <Route path="/creator/nft-campaigns" element={<ProtectedRoute requiredRole="creator"><CreatorNFTCampaigns /></ProtectedRoute>} />
        <Route path="/creator/nft-campaigns/:id" element={<ProtectedRoute requiredRole="creator"><CreatorNFTCampaignDetail /></ProtectedRoute>} />
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
    </div>
  );
}

export default function App() {

  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteLayout />
    </BrowserRouter>
  );
}
