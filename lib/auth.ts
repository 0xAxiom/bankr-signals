import { verifyMessage } from "viem";

/**
 * Verify EIP-191 signature using viem's ecrecover.
 * Returns true if the signature was produced by the claimed address.
 */
export async function verifySignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  // Validate signature format: 0x + 65 bytes (r + s + v) = 132 hex chars
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    return false;
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return false;
  }

  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}
