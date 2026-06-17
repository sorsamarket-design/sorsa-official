import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { saveReferralCode } from '../lib/referrals';

export default function ReferralLanding() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    if (ref) saveReferralCode(ref);
  }, [ref]);

  return <Navigate to="/auth/creator" replace />;
}
