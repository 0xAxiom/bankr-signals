// Deterministic avatar generation utilities

export function hashToHue(address: string): number {
  // Simple hash function to convert wallet address to hue (0-360)
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    const char = address.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 360;
}

export function getInitials(name: string): string {
  // Extract first 2 characters from name, fallback to first 2 chars of address
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarStyle(address: string, name: string): { backgroundColor: string; color: string; initials: string } {
  const hue = hashToHue(address);
  return {
    backgroundColor: `hsl(${hue}, 70%, 40%)`,
    color: 'white',
    initials: getInitials(name)
  };
}