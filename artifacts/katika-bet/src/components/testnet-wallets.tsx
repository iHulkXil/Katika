import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useServerSession } from '@/components/server-session';
import { evmTestnets } from '@/lib/testnet-chains';
import {
  CHIP_ADDRESS,
  encodeApprove,
  encodeBalanceOf,
  encodeDeposit,
  encodeWithdraw,
  fromWei,
  SEPOLIA_ID,
  SELECTORS,
  VAULT_ADDRESS,
} from '@/lib/sepolia-chip';

function shorten(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function rpc(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return response.json();
}

export function TestnetWallets() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { refresh } = useServerSession();
  const { wallets } = useWallets();
  const [evm, setEvm] = useState('...');
  const [chip, setChip] = useState('...');
  const [status, setStatus] = useState<string | null>(null);
  const wallet = wallets[0];
  const evmAddress = wallet?.address ?? user?.wallet?.address;
  const rpcUrl = evmTestnets[0].rpcUrls.default.http[0];

  useEffect(() => {
    if (!evmAddress) return;
    void rpc(rpcUrl, 'eth_getBalance', [evmAddress, 'latest'])
      .then((body) => setEvm((Number(BigInt(body.result ?? '0x0')) / 1e18).toFixed(5)))
      .catch(() => setEvm('n/a'));
  }, [evmAddress, rpcUrl]);

  useEffect(() => {
    if (!evmAddress || !CHIP_ADDRESS) {
      setChip(CHIP_ADDRESS ? '...' : 'not deployed');
      return;
    }
    void rpc(rpcUrl, 'eth_call', [{ to: CHIP_ADDRESS, data: encodeBalanceOf(evmAddress) }, 'latest'])
      .then((body) => setChip(fromWei(body.result ?? '0x0').toFixed(2)))
      .catch(() => setChip('n/a'));
  }, [evmAddress, rpcUrl]);

  const send = async (to: string, data: string) => {
    if (!wallet) throw new Error('No EVM wallet');
    await wallet.switchChain(SEPOLIA_ID);
    const provider = await wallet.getEthereumProvider();
    return provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet.address, to, data }],
    });
  };

  const tableMove = async (path: string, amount: number) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Sign in first');
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((body as { error?: string }).error ?? 'Table update failed');
    await refresh();
  };

  const claim = async () => {
    setStatus('Claiming on Sepolia...');
    try {
      if (!CHIP_ADDRESS) throw new Error('Set VITE_SEPOLIA_CHIP');
      const hash = await send(CHIP_ADDRESS, SELECTORS.claim);
      setStatus(`Claimed to wallet ${String(hash).slice(0, 10)}... Deposit to play.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Claim failed');
    }
  };

  const lock = async () => {
    setStatus('Depositing 100 KCHIP to vault...');
    try {
      if (!CHIP_ADDRESS || !VAULT_ADDRESS) throw new Error('Set chip and vault addresses');
      const amount = 100n * 10n ** 18n;
      await send(CHIP_ADDRESS, encodeApprove(VAULT_ADDRESS, amount));
      await send(VAULT_ADDRESS, encodeDeposit(amount));
      await tableMove('/api/kchip/deposit', 100);
      setStatus('100 KCHIP is on the table');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Deposit failed');
    }
  };

  const unlock = async () => {
    setStatus('Withdrawing 100 KCHIP...');
    try {
      if (!VAULT_ADDRESS) throw new Error('Set VITE_SEPOLIA_VAULT');
      await tableMove('/api/kchip/withdraw', 100);
      const hash = await send(VAULT_ADDRESS, encodeWithdraw(100n * 10n ** 18n));
      setStatus(`Withdrew 100 KCHIP ${String(hash).slice(0, 10)}...`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Withdraw failed');
    }
  };

  if (!ready || !authenticated) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[.16em] text-secondary">Sepolia KCHIP</p>
      <p className="mt-2 text-xs text-muted-foreground">Claim into the wallet, then deposit to the vault to load the table. Sepolia only. Not mainnet cash.</p>
      <div className="mt-3 space-y-1 font-mono-custom text-xs">
        <p>EVM {evmAddress ? shorten(evmAddress) : '—'} · {evm} ETH</p>
        <p>Wallet KCHIP {chip}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {wallet ? evmTestnets.map((chain) => (
          <button key={chain.id} type="button" className={`rounded-lg border px-2 py-1 text-[11px] ${chain.id === SEPOLIA_ID ? 'border-primary text-primary' : 'border-border'}`} onClick={() => void wallet.switchChain(chain.id)}>
            {chain.name}
          </button>
        )) : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <button type="button" onClick={() => void claim()} className="rounded-lg bg-secondary py-2 text-sm font-semibold text-secondary-foreground">Claim 1000 KCHIP</button>
        <button type="button" onClick={() => void lock()} className="rounded-lg border border-border py-2 text-sm">Deposit 100 to table</button>
        <button type="button" onClick={() => void unlock()} className="rounded-lg border border-border py-2 text-sm">Withdraw 100 from table</button>
      </div>
      {status ? <p className="mt-2 text-xs text-muted-foreground">{status}</p> : null}
      <a className="mt-3 inline-block text-[11px] text-primary" href="https://sepoliafaucet.com" target="_blank" rel="noreferrer">Sepolia ETH faucet</a>
    </div>
  );
}
