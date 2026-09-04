# Sepolia testnet chip

Deploy on **Ethereum Sepolia only** (chain id 11155111). Do not deploy to mainnet.

## Remix

1. Open https://remix.ethereum.org
2. New file `KatikaSepoliaChip.sol` and paste the contract from this folder.
3. Compiler 0.8.24, enable optimization optional.
4. Deploy tab: Environment **Injected Provider**, MetaMask on **Sepolia**.
5. Deploy `KatikaSepoliaChip`.
6. Copy the address.
7. Deploy `KatikaSepoliaVault` with that chip address as constructor argument.
8. Put both addresses in `.env` / `new.env`:

```
VITE_SEPOLIA_CHIP=0x...
VITE_SEPOLIA_VAULT=0x...
```

Restart Vite after saving env.

Need a little Sepolia ETH for gas: https://sepoliafaucet.com
