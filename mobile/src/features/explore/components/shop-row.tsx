import { LinkRow } from '@/shared/ui/list-row';
import { Text } from '@/shared/ui/text';
import { Thumb } from '@/shared/ui/thumb';
import { colors } from '@/shared/ui/theme';
import type { ShopSummary } from '../api/explore';
import { formatDistance } from '../lib/distance';

export function ShopRow({ shop, distanceKm }: { shop: ShopSummary; distanceKm?: number }) {
  const distance = distanceKm === undefined ? null : formatDistance(distanceKm);
  return (
    <LinkRow
      href={`/barbearia/${shop.id}`}
      label={[shop.name, shop.address, distance].filter(Boolean).join(', ')}
      leading={<Thumb uri={shop.logoUrl} name={shop.name} />}
      trailing={
        distance ? (
          <Text variant="numeral" style={{ fontSize: 16, color: colors.accent }}>
            {distance}
          </Text>
        ) : null
      }
    >
      <Text variant="label" style={{ fontSize: 17 }}>
        {shop.name}
      </Text>
      <Text variant="muted" numberOfLines={1}>
        {shop.address}
      </Text>
    </LinkRow>
  );
}
