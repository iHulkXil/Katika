import { Link } from 'wouter';

export function PvP21Page() {
  return (
    <div className="px-3 pt-6 text-center">
      <h1 className="text-xl font-bold text-[#E8F2EC]">PvP 21</h1>
      <p className="mt-2 text-sm text-[#8FA39A]">This game is being updated.</p>
      <Link href="/pvp" className="mt-4 inline-block rounded-lg bg-[#35D399] px-4 py-2 text-sm font-semibold text-[#062018]">
        Back to PvP
      </Link>
    </div>
  );
}
