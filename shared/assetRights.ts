export const ASSET_SOURCE_LABELS = {
  CLIENT_OWNED: 'Client-owned work',
  THIRD_PARTY_LICENSE: 'Third-party license',
  PUBLIC_DOMAIN: 'Public domain',
  OTHER_DECLARED: 'Other declared source',
} as const;
export type AssetSourceKind = keyof typeof ASSET_SOURCE_LABELS;
export function isAssetSourceKind(value: unknown): value is AssetSourceKind {
  return typeof value === 'string' && Object.hasOwn(ASSET_SOURCE_LABELS, value);
}
