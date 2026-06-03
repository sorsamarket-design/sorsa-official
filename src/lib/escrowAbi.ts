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
