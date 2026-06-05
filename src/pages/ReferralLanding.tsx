import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { saveReferralCode } from '../lib/referrals';

export default function ReferralLanding() {
  const { code } = useParams();

  useEffect(() => {
    if (code) saveReferralCode(code);
  }, [code]);

  return <Navigate to="/auth/creator" replace />;
}
