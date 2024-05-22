export interface ShieldingKey {
  key: CryptoKey;
  createdByTx?: `0x${string}`;
  createdAtHeight?: number;
}

export type ShieldingKeyMeta = Pick<
  ShieldingKey,
  'createdByTx' | 'createdAtHeight'
>;

export type ShieldingKeyData = {
  key: `0x${string}`;
} & Pick<ShieldingKey, 'createdByTx' | 'createdAtHeight'>;
