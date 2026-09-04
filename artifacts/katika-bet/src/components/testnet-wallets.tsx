import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { evmTestnets, SOLANA_DEVNET_RPC } from '@/lib/testnet-chains';

function shorten(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function evmBalance(rpc: string, address: string) {
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });
  const body = await response.json();
  const wei = BigInt(body.result ?? '0x0');
  return Number(wei) / 1e18;
}

async function solBalance(rpc: string, address: string) {
  const response = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address],
    }),
  });
  const body = await response.json();
  return Number(body.result?.value ?? 0) / 1e9;
}

export function TestnetWallets() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [evm, setEvm] = useState<string>('...');
  const [sol, setSol] = useState<string>('...');
  const evmAddress = wallets[0]?.address ?? user?.wallet?.address;
  const solAddress = user?.linkedAccounts?.find((account) => account.type === 'wallet' && 'chainType' in account && account.chainType === 'solana') as { address?: string } | undefined;
  const solAddr = solAddress?.address;

  useEffect(() => {
    if (!evmAddress) return;
    void evmBalance(evmTestnets[0].rpcUrls.default.http[0], evmAddress)
      .then((value) => setEvm(value.toFixed(5)))
      .catch(() => setEvm('n/a'));
  }, [evmAddress]);

  useEffect(() => {
    if (!solAddr) {
      setSol('—');
      return;
    }
    void solBalance(SOLANA_DEVNET_RPC, solAddr)
      .then((value) => setSol(value.toFixed(4)))
      .catch(() => setSol('n/a'));
  }, [solAddr]);

  if (!ready || !authenticated) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[.16em] text-secondary">Testnets</p>
      <p className="mt-2 text-xs text-muted-foreground">Wallets can sit on Sepolia and other EVM testnets, plus Solana devnet. Tables still use demo credits. No mainnet cash.</p>
      <div className="mt-3 space-y-2 text-sm">
        <p className="font-mono-custom text-xs">EVM {evmAddress ? shorten(evmAddress) : '—'} · Sepolia {evm} ETH</p>
        <p className="font-mono-custom text-xs">SOL {solAddr ? shorten(solAddr) : 'not linked'} · devnet {sol} SOL</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wallets[0] ? evmTestnets.map((chain) => (
          <button
            key={chain.id}
            type="button"
            className="rounded-lg border border-border px-2 py-1 text-[11px]"
            onClick={() => void wallets[0].switchChain(chain.id)}
          >
            {chain.name}
          </button>
        )) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <a className="text-primary" href="https://sepoliafaucet.com" target="_blank" rel="noreferrer">Sepolia faucet</a>
        <a className="text-primary" href="https://faucet.solana.com" target="_blank" rel="noreferrer">Solana faucet</a>
      </div>
    </div>
  );
}
