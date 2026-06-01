/**
 * Custom Reward Engine for Sorsa.market
 * 
 * Logic:
 * 1. Base = Sorsa Score * 0.1
 * 2. Followers Boost: Up to 10%
 * 3. Impressions Boost: Up to 10% (Summed)
 * 4. Engagement Boost: Tiered based on likes + comments
 * 
 * Final = Base * (1 + FollowerBoost + ImpressionBoost + EngagementBoost)
 */

export const calculateReward = (metrics: {
  sorsaScore: number;
  followerCount: number;
  totalImpressions: number;
  engagementScore: number; // Likes + Comments summed
}) => {
  const { sorsaScore, followerCount, totalImpressions, engagementScore } = metrics;

  // 1. Base Reward (Linear: 100 score = $10)
  const base = sorsaScore * 0.1;

  // 2. Follower Boost (Up to 10% at 5000+ followers)
  const followerBoost = Math.min((followerCount / 5000) * 0.1, 0.1);

  // 3. Impression Boost (Up to 10% at 10,000+ impressions)
  const impressionBoost = Math.min((totalImpressions / 10000) * 0.1, 0.1);

  // 4. Engagement Boost (Tiered)
  let engagementBoost = 0;
  if (engagementScore >= 1000) {
    engagementBoost = 0.50; // Viral (50% boost)
  } else if (engagementScore >= 250) {
    engagementBoost = 0.25; // Strong (25% boost)
  } else if (engagementScore >= 50) {
    engagementBoost = 0.10; // Basic (10% boost)
  }

  const final = base * (1 + followerBoost + impressionBoost + engagementBoost);

  return {
    base,
    boosts: {
      follower: followerBoost,
      impression: impressionBoost,
      engagement: engagementBoost
    },
    final: Number(final.toFixed(2))
  };
};
