import { MarketsHome } from '@/components/markets-home';
import { PvpSideRail } from '@/components/pvp-toon-visualizer';

export function DiscoverPage() {
  return <MarketsHome variant="discover" sideRail={<PvpSideRail />} />;
}
