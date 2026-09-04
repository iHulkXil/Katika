export type EvmChain = {
  id: number;
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: { default: { http: string[] } };
  blockExplorers: { default: { name: string; url: string } };
};

export const sepolia: EvmChain = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' } },
};

export const baseSepolia: EvmChain = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
  blockExplorers: { default: { name: 'Basescan', url: 'https://sepolia.basescan.org' } },
};

export const arbitrumSepolia: EvmChain = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://sepolia-rollup.arbitrum.io/rpc'] } },
  blockExplorers: { default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' } },
};

export const polygonAmoy: EvmChain = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } },
  blockExplorers: { default: { name: 'Polygonscan', url: 'https://amoy.polygonscan.com' } },
};

export const evmTestnets = [sepolia, baseSepolia, arbitrumSepolia, polygonAmoy];

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
export const SOLANA_TESTNET_RPC = 'https://api.testnet.solana.com';
