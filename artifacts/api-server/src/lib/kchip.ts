const BALANCE_OF = "0x70a08231";

function chipAddress() {
  return (process.env.SEPOLIA_CHIP || process.env.VITE_SEPOLIA_CHIP || "").toLowerCase();
}

function rpcUrl() {
  return process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
}

function padAddress(address: string) {
  return address.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

export async function readKchipBalance(address: string) {
  const chip = chipAddress();
  if (!chip.startsWith("0x") || chip.length !== 42) return 0;
  const data = `${BALANCE_OF}${padAddress(address)}`;
  const response = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: chip, data }, "latest"],
    }),
  });
  const body = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!body.result || body.result === "0x") return 0;
  const raw = BigInt(body.result);
  return Number(raw / 10n ** 18n);
}
