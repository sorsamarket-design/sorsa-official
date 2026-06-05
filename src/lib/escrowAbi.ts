export const campaignEscrowAbi = [
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'platform',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'createCampaignWithSignature',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'brand', type: 'address' },
      { name: 'budget', type: 'uint256' },
      { name: 'startsAt', type: 'uint64' },
      { name: 'endsAt', type: 'uint64' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'campaigns',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'brand', type: 'address' },
      { name: 'budget', type: 'uint256' },
      { name: 'escrowedBudget', type: 'uint256' },
      { name: 'platformFee', type: 'uint256' },
      { name: 'baseRewardPool', type: 'uint256' },
      { name: 'performanceRewardPool', type: 'uint256' },
      { name: 'reservedBaseRewards', type: 'uint256' },
      { name: 'allocatedPerformanceRewards', type: 'uint256' },
      { name: 'allocated', type: 'uint256' },
      { name: 'paid', type: 'uint256' },
      { name: 'startsAt', type: 'uint64' },
      { name: 'endsAt', type: 'uint64' },
      { name: 'releaseAt', type: 'uint64' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'allocationsSet', type: 'bool' },
      { name: 'cancelled', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'setAllocations',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'recipients', type: 'address[]' },
      { name: 'performanceAmounts', type: 'uint256[]' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'distribute',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'maxPayments', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancelUnallocatedCampaign',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'payoutsLength',
    stateMutability: 'view',
    inputs: [{ name: 'campaignId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'payoutAt',
    stateMutability: 'view',
    inputs: [
      { name: 'campaignId', type: 'bytes32' },
      { name: 'index', type: 'uint256' }
    ],
    outputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'paid', type: 'bool' }
    ]
  },
  {
    type: 'event',
    name: 'CampaignCreated',
    anonymous: false,
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'brand', type: 'address', indexed: true },
      { name: 'budget', type: 'uint256', indexed: false },
      { name: 'escrowedBudget', type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
      { name: 'startsAt', type: 'uint64', indexed: false },
      { name: 'endsAt', type: 'uint64', indexed: false },
      { name: 'releaseAt', type: 'uint64', indexed: false },
      { name: 'metadataHash', type: 'bytes32', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'AllocationsSet',
    anonymous: false,
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'recipientCount', type: 'uint256', indexed: false },
      { name: 'allocated', type: 'uint256', indexed: false },
      { name: 'refund', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'PayoutSent',
    anonymous: false,
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'CampaignPaid',
    anonymous: false,
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'totalPaid', type: 'uint256', indexed: false },
      { name: 'refund', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'CampaignCancelled',
    anonymous: false,
    inputs: [
      { name: 'campaignId', type: 'bytes32', indexed: true },
      { name: 'refunded', type: 'uint256', indexed: false }
    ]
  }
] as const;

export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

export const createCampaignTypes = {
  CreateCampaign: [
    { name: 'campaignId', type: 'bytes32' },
    { name: 'brand', type: 'address' },
    { name: 'budget', type: 'uint256' },
    { name: 'startsAt', type: 'uint64' },
    { name: 'endsAt', type: 'uint64' },
    { name: 'metadataHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
} as const;
