import CapturedDex from "@/components/CapturedDex";
import { getCapturedIds, getNationalDexCount } from "@/lib/pokeapi";

export default async function CapturadosPage() {
  const [capturedIds, dexCount] = await Promise.all([getCapturedIds(), getNationalDexCount()]);

  return <CapturedDex capturedIds={capturedIds} dexCount={dexCount} />;
}
