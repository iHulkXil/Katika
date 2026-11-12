export type EvmChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers: { default: { name: string; url: string } };
};

// EVM Mainnets
export const mainnet: EvmChain = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://cloudflare-eth.com', 'https://eth.llamarpc.com'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } },
};

export const base: EvmChain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://basescan.org' } },
};

export const arbitrum: EvmChain = {
  id: 42161,
  name: 'Arbitrum One',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
  blockExplorers: { default: { name: 'Arbiscan', url: 'https://arbiscan.io' } },
};

export const polygon: EvmChain = {
  id: 137,
  name: 'Polygon',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: { default: { http: ['https://polygon-rpc.com'] } },
  blockExplorers: { default: { name: 'PolygonScan', url: 'https://polygonscan.com' } },
};

export const evmMainnets: EvmChain[] = [base, mainnet, arbitrum, polygon];

// Solana Mainnet-Beta configuration
export const SOLANA_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Official SIDEBET Treasury Vault addresses for on-chain deposits
export const SOLANA_TREASURY_PUBKEY = '6WBC6z2j35UeH1E5fWb2J9qE9Dfv9Y1sWq8rD5hG7tK'; // Sidebet multi-sig / treasury
export const EVM_TREASURY_ADDRESS = '0x88B3b0fF297E524b07D024fFE21B7C9592f7e77D'; // Sidebet EVM treasury
