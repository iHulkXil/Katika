export const SEPOLIA_ID = 11155111;
export const CHIP_ADDRESS = (import.meta.env.VITE_SEPOLIA_CHIP ?? '').trim();
export const VAULT_ADDRESS = (import.meta.env.VITE_SEPOLIA_VAULT ?? '').trim();

export const SELECTORS = {
  claim: '0x4e71d92d',
  decimals: '0x313ce567',
  balanceOf: '0x70a08231',
  approve: '0x095ea7b3',
  deposit: '0xb6b55f25',
  withdraw: '0x2e1a7d4d',
  deposited: '0x5bd9ea4c',
};

export function padAddress(address: string) {
  return address.slice(2).toLowerCase().padStart(64, '0');
}

export function encodeBalanceOf(address: string) {
  return `${SELECTORS.balanceOf}${padAddress(address)}`;
}

export function encodeDeposited(address: string) {
  return `0x5bd9ea4c${padAddress(address)}`;
}

export function encodeUint(value: bigint) {
  return value.toString(16).padStart(64, '0');
}

export function encodeApprove(spender: string, amount: bigint) {
  return `${SELECTORS.approve}${padAddress(spender)}${encodeUint(amount)}`;
}

export function encodeDeposit(amount: bigint) {
  return `${SELECTORS.deposit}${encodeUint(amount)}`;
}

export function encodeWithdraw(amount: bigint) {
  return `${SELECTORS.withdraw}${encodeUint(amount)}`;
}

export function fromWei(hex: string) {
  try {
    return Number(BigInt(hex)) / 1e18;
  } catch {
    return 0;
  }
}
