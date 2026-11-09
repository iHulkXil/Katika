import { Link } from 'wouter';

export function ComingSoon({ title = 'Coming Soon' }: { title?: string }) {
  return (
    <div className="px-3 pt-16 text-center">
      <h1 className="text-xl font-bold text-[#E8F2EC]">{title}</h1>
      <p className="mt-2 text-sm text-[#8FA39A]">This section is being rebuilt for the web3 MVP.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-[#35D399] px-4 py-2 text-sm font-semibold text-[#062018]">
        Back to Markets
      </Link>
    </div>
  );
}
