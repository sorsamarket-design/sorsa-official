export const mockBrandNotifications = [
  { id: 'n1', title: 'New Submission', message: '@crypto_khalid submitted a post for DeFi Protocol V2.', time: '10m ago', read: false, type: 'submission' },
  { id: 'n2', title: 'Campaign Approved', message: 'Your campaign "Summer Collection Launch" is now live.', time: '2h ago', read: false, type: 'campaign' },
  { id: 'n3', title: 'Creator Joined', message: '@nft_sarah joined your campaign.', time: '5h ago', read: true, type: 'creator' },
];

export const mockCreatorNotifications = [
  { id: 'n1', title: 'Submission Approved', message: 'Your submission for "DeFi Protocol V2" was approved! +15 Points.', time: '1h ago', read: false, type: 'success' },
  { id: 'n2', title: 'Revision Requested', message: 'Aave requested a revision on your recent submission.', time: '3h ago', read: false, type: 'warning' },
  { id: 'n3', title: 'New Campaign Match', message: 'You match the requirements for "NFT Marketplace Beta".', time: '1d ago', read: true, type: 'info' },
];

export const mockBrandProfiles = [
  { 
    id: '1', 
    name: 'Nike', 
    logo: 'https://picsum.photos/seed/nike/100/100',
    xHandle: '@nike',
    website: 'nike.com',
    description: 'Innovative athletic footwear, apparel, equipment, and accessories for sports and fitness.'
  },
  { 
    id: '2', 
    name: 'Adidas', 
    logo: 'https://picsum.photos/seed/adidas/100/100',
    xHandle: '@adidas',
    website: 'adidas.com',
    description: 'Designing and manufacturing shoes, clothing and accessories. Impossible is Nothing.'
  },
];

export const mockStats = {
  activeCampaigns: 3,
  totalSpent: 12500,
  creatorsEngaged: 45,
  avgSorsaScore: 92,
};

export const mockCampaigns = [
  { id: '1', name: 'Summer Collection Launch', profile: 'Nike', status: 'Active', creatorsJoined: 12, budget: 5000, endDate: '2026-06-01' },
  { id: '2', name: 'Running Shoes Promo', profile: 'Nike', status: 'Draft', creatorsJoined: 0, budget: 2500, endDate: '2026-07-15' },
  { id: '3', name: 'Fitness App Collab', profile: 'Nike', status: 'Completed', creatorsJoined: 33, budget: 5000, endDate: '2026-03-10' },
];

export const mockCampaignDetail = {
  id: '1',
  title: 'Summer Collection Launch',
  brandLogo: 'https://picsum.photos/seed/nike/100/100',
  brandName: 'Nike',
  xHandle: 'nike',
  categories: ['DeFi', 'NFT'],
  status: 'Live',
  stats: {
    creatorsJoined: 12,
    budget: 5000,
    baseReward: 2000,
    performanceBonus: 2250,
    daysRemaining: 14
  },
  brief: {
    objectives: 'Drive awareness for our new summer collection. We want to highlight the comfort and durability of our new materials. Focus on lifestyle shots and authentic reviews.',
    spotlightRequests: ['Mention @Nike', 'Use hashtag #NikeSummer', 'Include link to nike.com/summer in bio or thread'],
    requirements: ['Must have >10k followers', 'Crypto native audience', 'No previous promotions for direct competitors in the last 30 days'],
    startDate: '2026-05-01',
    endDate: '2026-06-01'
  }
};

export const mockJoinedCreators = [
  { id: 'c1', handle: '@crypto_khalid', score: 95, followers: '45.2k', joinedDate: '2026-05-02', status: 'Submitted' },
  { id: 'c2', handle: '@nft_sarah', score: 88, followers: '12.1k', joinedDate: '2026-05-03', status: 'Joined' },
  { id: 'c3', handle: '@defi_degen', score: 92, followers: '105k', joinedDate: '2026-05-05', status: 'Approved' },
];

export const mockSubmissions = [
  { id: 's1', creatorName: '@crypto_khalid', link: 'https://x.com/crypto_khalid/status/123456', status: 'Pending', rating: 0 },
  { id: 's2', creatorName: '@defi_degen', link: 'https://x.com/defi_degen/status/789012', status: 'Approved', rating: 0 },
  { id: 's3', creatorName: '@web3_guru', link: 'https://x.com/web3_guru/status/345678', status: 'Revision Requested', rating: 0 },
  { id: 's4', creatorName: '@eth_maxi', link: 'https://x.com/eth_maxi/status/901234', status: 'Approved', rating: 5 },
];

export const mockBrowseCampaigns = [
  {
    id: 'c1',
    title: 'DeFi Protocol V2 Launch',
    brandName: 'Aave',
    brandLogo: 'https://picsum.photos/seed/aave/100/100',
    xHandle: 'aave',
    categories: ['DeFi'],
    tier: 'KOL',
    status: 'Open',
    budget: 15000,
    baseReward: 1000,
    performanceBonus: 2000,
    deadline: '2026-04-15',
    slots: '3/10',
    createdAt: '2026-04-01',
    previewText: '💡 Campaign Overview - Campaign Name: DeFi Protocol V2 Launch · Aave. - Core Message: We are launching Aave V2 with new features including yield delegation and improved flash loans...',
    brief: {
      objectives: 'We are launching Aave V2 with new features including yield delegation and improved flash loans. We need KOLs to explain these features to their audience in a clear, engaging way.',
      spotlightRequests: [
        'Mention @aave',
        'Explain Yield Delegation',
        'Include link to app.aave.com in bio or thread'
      ],
      requirements: [
        '500+ Sorsa score',
        'Japan'
      ],
      startDate: '2026-04-05',
      endDate: '2026-04-15'
    }
  },
  {
    id: 'c2',
    title: 'ZK Rollup Explainer',
    brandName: 'Starknet',
    brandLogo: 'https://picsum.photos/seed/starknet/100/100',
    xHandle: 'Starknet',
    categories: ['ZK'],
    tier: 'General',
    status: 'Open',
    budget: 5000,
    baseReward: 300,
    performanceBonus: 500,
    deadline: '2026-04-20',
    slots: 'Open',
    createdAt: '2026-04-02',
    previewText: '💡 Campaign Overview - Campaign Name: ZK Rollup Explainer · Starknet. - Core Message: Explain the benefits of ZK rollups and how Starknet is scaling Ethereum...',
    brief: {
      objectives: 'Explain the benefits of ZK rollups and how Starknet is scaling Ethereum. Focus on low fees and fast finality.',
      spotlightRequests: [
        'Mention @Starknet',
        'Explain ZK Rollups simply'
      ],
      requirements: [
        '150+ Sorsa score'
      ],
      startDate: '2026-04-05',
      endDate: '2026-04-20'
    }
  },
  {
    id: 'c3',
    title: 'AI Trading Bot Review',
    brandName: 'Fetch.ai',
    brandLogo: 'https://picsum.photos/seed/fetch/100/100',
    xHandle: 'Fetch_ai',
    categories: ['AI', 'DeFi'],
    tier: 'KOL',
    status: 'Open',
    budget: 25000,
    baseReward: 2000,
    performanceBonus: 3000,
    deadline: '2026-04-10',
    slots: '1/5',
    createdAt: '2026-03-28',
    previewText: '💡 Campaign Overview - Campaign Name: AI Trading Bot Review · Fetch.ai. - Core Message: Review our new AI-powered trading bot and demonstrate its capabilities...',
    brief: {
      objectives: 'Review our new AI-powered trading bot and demonstrate its capabilities. Show a live trade if possible.',
      spotlightRequests: [
        'Mention @Fetch_ai',
        'Show the bot interface'
      ],
      requirements: [
        '500+ Sorsa score',
        'English'
      ],
      startDate: '2026-03-30',
      endDate: '2026-04-10'
    }
  },
  {
    id: 'c4',
    title: 'DePIN Network Node Setup',
    brandName: 'Helium',
    brandLogo: 'https://picsum.photos/seed/helium/100/100',
    xHandle: 'helium',
    categories: ['DePIN'],
    tier: 'General',
    status: 'Open',
    budget: 8000,
    baseReward: 400,
    performanceBonus: 800,
    deadline: '2026-05-01',
    slots: '12/50',
    createdAt: '2026-04-03',
    previewText: '💡 Campaign Overview - Campaign Name: DePIN Network Node Setup · Helium. - Core Message: Show your audience how easy it is to set up a Helium node and start earning...',
    brief: {
      objectives: 'Show your audience how easy it is to set up a Helium node and start earning. Focus on the passive income aspect.',
      spotlightRequests: [
        'Mention @helium',
        'Show a picture of a node'
      ],
      requirements: [
        '150+ Sorsa score'
      ],
      startDate: '2026-04-10',
      endDate: '2026-05-01'
    }
  },
  {
    id: 'c5',
    title: 'NFT Marketplace Beta',
    brandName: 'Blur',
    brandLogo: 'https://picsum.photos/seed/blur/100/100',
    xHandle: 'blur_io',
    categories: ['NFT'],
    tier: 'General',
    status: 'Open',
    budget: 10000,
    baseReward: 500,
    performanceBonus: 1000,
    deadline: '2026-04-25',
    slots: 'Open',
    createdAt: '2026-04-01',
    previewText: '💡 Campaign Overview - Campaign Name: NFT Marketplace Beta · Blur. - Core Message: Showcase the speed and efficiency of our new bidding interface for pro traders...',
    brief: {
      objectives: 'Showcase the speed and efficiency of our new bidding interface for pro traders. Compare it to other marketplaces.',
      spotlightRequests: [
        'Mention @blur_io',
        'Show the sweeping feature'
      ],
      requirements: [
        '150+ Sorsa score'
      ],
      startDate: '2026-04-05',
      endDate: '2026-04-25'
    }
  }
];

export const mockPastBrowseCampaigns = [
  {
    id: 'pc_1',
    title: 'Solana Meme Coin Launch',
    brandName: 'Doge CEO',
    brandLogo: 'https://picsum.photos/seed/solana/100/100',
    xHandle: 'doge_ceo',
    categories: ['DeFi'],
    tier: 'General',
    status: 'Completed',
    budget: 12000,
    baseReward: 200,
    performanceBonus: 500,
    deadline: '2026-02-15',
    slots: '50/50',
    createdAt: '2026-01-20',
    previewText: 'This campaign has successfully completed with massive reach for the new Solana meme token.',
    brief: {
      objectives: 'Drive initial community growth and DEX volume.',
      spotlightRequests: ['Mention @doge_ceo'],
      requirements: ['150+ Sorsa score'],
      startDate: '2026-01-25',
      endDate: '2026-02-15'
    }
  },
  {
    id: 'pc_2',
    title: 'Web3 Gaming Tournament',
    brandName: 'Axie Infinity',
    brandLogo: 'https://picsum.photos/seed/axie/100/100',
    xHandle: 'AxieInfinity',
    categories: ['NFT'],
    tier: 'KOL',
    status: 'Completed',
    budget: 35000,
    baseReward: 1500,
    performanceBonus: 3000,
    deadline: '2026-03-01',
    slots: '20/20',
    createdAt: '2026-02-01',
    previewText: 'A fully funded month-long tournament promo.',
    brief: {
      objectives: 'Get top gamers to stream their tournament runs.',
      spotlightRequests: ['Stream at least 2 hours'],
      requirements: ['500+ Sorsa score'],
      startDate: '2026-02-10',
      endDate: '2026-03-01'
    }
  }
];

export const mockCreatorCampaignDetail = {
  id: 'c1',
  title: 'DeFi Protocol V2 Launch',
  brandName: 'Aave',
  brandLogo: 'https://picsum.photos/seed/aave/100/100',
  xHandle: 'aave',
  categories: ['DeFi'],
  tier: 'KOL',
  status: 'Open',
  budget: 15000,
  baseReward: 1000,
  performanceBonus: 2000,
  deadline: '2026-04-15',
  slots: '3/10',
  createdAt: '2026-04-01',
  brief: {
    objectives: 'We are launching Aave V2 with new features including yield delegation and improved flash loans. We need KOLs to explain these features to their audience in a clear, engaging way.',
    spotlightRequests: [
      'Mention @aave',
      'Explain Yield Delegation',
      'Include link to app.aave.com in bio or thread'
    ],
    requirements: [
      '500+ Sorsa score',
      'Japan'
    ],
    startDate: '2026-04-05',
    endDate: '2026-04-15'
  }
};

export const mockActiveCreatorCampaigns = [
  {
    id: 'ac1',
    title: 'Summer Collection Launch',
    brandName: 'Nike',
    brandLogo: 'https://picsum.photos/seed/nike/100/100',
    deadline: '2026-04-10',
    submissionStatus: 'Not Submitted',
    pointsEarned: 5,
    brief: {
      objectives: 'Drive awareness for our new summer collection. We want to highlight the comfort and durability of our new materials. Focus on lifestyle shots and authentic reviews.',
      spotlightRequests: [
        'Mention @Nike',
        'Use hashtag #NikeSummer',
        'Include link to nike.com/summer in bio or thread'
      ]
    }
  },
  {
    id: 'ac2',
    title: 'DeFi Protocol V2',
    brandName: 'Aave',
    brandLogo: 'https://picsum.photos/seed/aave/100/100',
    deadline: '2026-04-15',
    submissionStatus: 'Needs Revision',
    pointsEarned: 15,
    submissionDetails: {
      url: 'https://x.com/crypto_khalid/status/123456789',
      notes: 'I focused heavily on the yield delegation feature as requested.',
      feedback: 'Great thread, but please make sure to include the specific link to app.aave.com in the first tweet.'
    },
    brief: {
      objectives: 'We are launching Aave V2 with new features including yield delegation and improved flash loans. We need KOLs to explain these features to their audience in a clear, engaging way.',
      spotlightRequests: [
        'Mention @aave',
        'Explain Yield Delegation',
        'Include link to app.aave.com in bio or thread'
      ]
    }
  },
  {
    id: 'ac3',
    title: 'NFT Marketplace Beta',
    brandName: 'Blur',
    brandLogo: 'https://picsum.photos/seed/blur/100/100',
    deadline: '2026-04-20',
    submissionStatus: 'Submitted',
    pointsEarned: 15,
    submissionDetails: {
      url: 'https://x.com/crypto_khalid/status/987654321',
      notes: 'Included a video walkthrough of the new bidding interface.'
    },
    brief: {
      objectives: 'Showcase the speed and efficiency of our new bidding interface for pro traders.',
      spotlightRequests: [
        'Mention @blur_io',
        'Show the sweeping feature',
        'Highlight zero fees'
      ]
    }
  }
];

export const mockBrandWallet = {
  amountSpent: 45000,
  escrow: 12500,
  transactions: [
    { id: 'tx1', date: '2026-04-01', campaign: 'Summer Collection Launch', amount: 5000, type: 'Funded', status: 'Completed' },
    { id: 'tx2', date: '2026-03-28', campaign: 'Running Shoes Promo', amount: 2500, type: 'Funded', status: 'Completed' },
    { id: 'tx3', date: '2026-03-15', campaign: 'Fitness App Collab', amount: 1200, type: 'Released', status: 'Completed' },
    { id: 'tx4', date: '2026-03-10', campaign: 'Fitness App Collab', amount: 5000, type: 'Funded', status: 'Completed' },
    { id: 'tx5', date: '2026-03-01', campaign: 'Deposit', amount: 50000, type: 'Deposit', status: 'Completed' }
  ]
};

export const mockCreatorWallet = {
  address: '0x71C7656EC7ab88b098defB751B7401B5f6d89A23',
  totalEarned: 3450,
  pendingRewards: 850,
  transactions: [
    { id: 'ctx1', date: '2026-03-20', campaign: 'Summer Collection Launch', amount: 500, status: 'Released' },
    { id: 'ctx2', date: '2026-02-15', campaign: 'DeFi Protocol V2', amount: 1200, status: 'Released' },
    { id: 'ctx3', date: '2026-01-10', campaign: 'NFT Marketplace Launch', amount: 800, status: 'Released' },
    { id: 'ctx4', date: '2026-04-02', campaign: 'DeFi Protocol V2', amount: 850, status: 'Pending' }
  ]
};

export const mockLeaderboard = [
  { id: 'l1', handle: '@nft_god', avatar: 'https://picsum.photos/seed/nftgod/150/150', sorsaScore: 980, points: 45000, campaignsCompleted: 85, usdcEarned: 125000 },
  { id: 'l2', handle: '@defi_whale', avatar: 'https://picsum.photos/seed/defiwhale/150/150', sorsaScore: 945, points: 38000, campaignsCompleted: 72, usdcEarned: 98000 },
  { id: 'l3', handle: '@web3_queen', avatar: 'https://picsum.photos/seed/web3queen/150/150', sorsaScore: 910, points: 32000, campaignsCompleted: 64, usdcEarned: 85000 },
  { id: 'l4', handle: '@eth_maxi', avatar: 'https://picsum.photos/seed/ethmaxi/150/150', sorsaScore: 890, points: 28000, campaignsCompleted: 55, usdcEarned: 72000 },
  { id: 'l5', handle: '@solana_summer', avatar: 'https://picsum.photos/seed/solana/150/150', sorsaScore: 850, points: 25000, campaignsCompleted: 48, usdcEarned: 61000 },
  { id: 'l6', handle: '@zk_ninja', avatar: 'https://picsum.photos/seed/zkninja/150/150', sorsaScore: 820, points: 21000, campaignsCompleted: 42, usdcEarned: 54000 },
  { id: 'l7', handle: '@depin_daily', avatar: 'https://picsum.photos/seed/depin/150/150', sorsaScore: 790, points: 18000, campaignsCompleted: 35, usdcEarned: 45000 },
  { id: 'l8', handle: '@ai_trader', avatar: 'https://picsum.photos/seed/aitrader/150/150', sorsaScore: 750, points: 15000, campaignsCompleted: 28, usdcEarned: 32000 },
  { id: 'l9', handle: '@metaverse_mike', avatar: 'https://picsum.photos/seed/metaverse/150/150', sorsaScore: 710, points: 13000, campaignsCompleted: 22, usdcEarned: 28000 },
  { id: 'l10', handle: '@gamefi_guru', avatar: 'https://picsum.photos/seed/gamefi/150/150', sorsaScore: 680, points: 11000, campaignsCompleted: 18, usdcEarned: 21000 },
  { id: 'c1', handle: '@crypto_khalid', avatar: 'https://picsum.photos/seed/creator/150/150', sorsaScore: 172, points: 12400, campaignsCompleted: 12, usdcEarned: 3450 },
  { id: 'l11', handle: '@layer2_lover', avatar: 'https://picsum.photos/seed/layer2/150/150', sorsaScore: 150, points: 9000, campaignsCompleted: 10, usdcEarned: 2800 },
];

export const mockCreatorProfile = {
  id: 'c1',
  name: 'Khalid',
  handle: '@crypto_khalid',
  avatar: 'https://picsum.photos/seed/creator/150/150',
  country: 'United Arab Emirates',
  bio: 'Web3 enthusiast, DeFi degen, and NFT collector. Sharing insights and deep dives into the crypto ecosystem.',
  walletAddress: '0x71C...9A23',
  sorsaScore: 172,
  stats: {
    campaignsCompleted: 12,
    totalUsdcEarned: 3450,
    sorsaPoints: 12400,
    memberSince: 'Jan 2026'
  },
  tags: ['DeFi', 'NFTs', 'Web3', 'Trading'],
  pastCampaigns: [
    { id: 'pc1', name: 'Summer Collection Launch', brand: 'Nike', brandLogo: 'https://picsum.photos/seed/nike/50/50', category: 'Lifestyle', date: 'Mar 2026', rating: 5, earned: 500 },
    { id: 'pc2', name: 'DeFi Protocol V2', brand: 'Aave', brandLogo: 'https://picsum.photos/seed/aave/50/50', category: 'DeFi', date: 'Feb 2026', rating: 4, earned: 1200 },
    { id: 'pc3', name: 'NFT Marketplace Launch', brand: 'OpenSea', brandLogo: 'https://picsum.photos/seed/opensea/50/50', category: 'NFT', date: 'Jan 2026', rating: 5, earned: 800 },
  ],
  reviews: [
    { id: 'r1', brand: 'Nike', rating: 5, comment: 'Great content, perfectly aligned with our brand guidelines. High engagement!' },
    { id: 'r2', brand: 'Aave', rating: 4, comment: 'Solid thread explaining our V2 features. Good reach within the DeFi community.' },
    { id: 'r3', brand: 'OpenSea', rating: 5, comment: 'Excellent video review of our new features. Highly recommended creator.' }
  ]
};

