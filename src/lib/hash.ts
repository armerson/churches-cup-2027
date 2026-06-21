export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, hashed: string): Promise<boolean> {
  if (hashed.length <= 4) return pin === hashed;
  return (await hashPin(pin)) === hashed;
}
