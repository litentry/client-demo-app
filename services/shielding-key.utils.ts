import { hexToU8a, stringToU8a, u8aToHex, u8aToString } from '@polkadot/util';
import { jsonDecrypt, jsonEncrypt } from '@polkadot/util-crypto';
import type { EncryptedJson } from '@polkadot/util-crypto/types';

import * as shieldingKeyDefaults from './defaults/shielding-key.defaults';
import { ShieldingKey, ShieldingKeyData } from './shielding-key.utils.types';

/**
 * Generates a random shielding key.
 */
export async function generate(): Promise<ShieldingKey> {
  const key = await global.crypto.subtle.generateKey(
    shieldingKeyDefaults.aesKeyGenParams,
    true,
    shieldingKeyDefaults.aesKeyUsages
  );
  return { key };
}

export async function decrypt(
  args: { ciphertext: Uint8Array; nonce: Uint8Array },
  shieldingKey: ShieldingKey
): Promise<{ cleartext: Uint8Array }> {
  try {
    // console.log('shix', shieldingKey);
    const decrypted = await global.crypto.subtle.decrypt(
      {
        name: shieldingKeyDefaults.aesKeyGenParams.name,
        iv: args.nonce,
      },
      shieldingKey.key,
      args.ciphertext
    );

    return { cleartext: new Uint8Array(decrypted) };
  } catch (e) {
    console.error(e);
    // It throws Throws OperationError if the ciphertext is invalid
    // We would like to return a more human error.
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generates a random nonce of 12 bytes.
 *
 * 12 bytes is the recommended size for AES-GCM and what is used by the Enclave in most cases.
 */
export function generateNonce12() {
  return global.crypto.getRandomValues(new Uint8Array(12));
}

export async function encrypt(
  args: { cleartext: Uint8Array; nonce: Uint8Array },
  shieldingKey: ShieldingKey
): Promise<{ ciphertext: Uint8Array }> {
  const encrypted = await global.crypto.subtle.encrypt(
    {
      name: shieldingKeyDefaults.aesKeyGenParams.name,
      iv: args.nonce,
    },
    shieldingKey.key,
    args.cleartext
  );

  return { ciphertext: new Uint8Array(encrypted) };
}

export async function encode(
  passphrase: string,
  shieldingKey: ShieldingKey
): Promise<EncryptedJson> {
  const raw = await global.crypto.subtle.exportKey('raw', shieldingKey.key);
  const data: ShieldingKeyData = {
    key: u8aToHex(new Uint8Array(raw)),
    createdByTx: shieldingKey.createdByTx,
    createdAtHeight: shieldingKey.createdAtHeight,
  };

  return jsonEncrypt(stringToU8a(JSON.stringify(data)), ['spki'], passphrase);
}

export async function decode(
  encryptedJson: EncryptedJson,
  passphrase: string
): Promise<ShieldingKey> {
  const dataUi8 = jsonDecrypt(encryptedJson, passphrase);
  const data: ShieldingKeyData | undefined = JSON.parse(u8aToString(dataUi8));
  const keyUi8 = hexToU8a(data!.key);

  const key = await global.crypto.subtle.importKey(
    'raw',
    keyUi8,
    shieldingKeyDefaults.aesKeyGenParams,
    true,
    shieldingKeyDefaults.aesKeyUsages
  );

  return {
    key,
    createdByTx: data?.createdByTx,
    createdAtHeight: data?.createdAtHeight,
  };
}
