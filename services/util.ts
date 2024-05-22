import {CredentialDefinition, credentialDefinitionMap} from "@litentry/credential-definitions";
import {hexToU8a, isHex} from '@polkadot/util';
import {decodeAddress, encodeAddress} from '@polkadot/util-crypto';
import validate from 'bitcoin-address-validation';
import type {HexString} from '@polkadot/util/types';
import {isString, u8aToHex, u8aToU8a} from '@polkadot/util';
import {Signer} from '@polkadot/types/types';

type KeyringSigner = {
    sign(message: Uint8Array): Uint8Array;
};

type SignOptions = {
    type?: 'bytes' | 'payload';
    signer?: Signer | null;
};

const defaultOptions: SignOptions = {
    type: 'bytes',
    signer: null,
};

const CURRENT_NETWORK_SS58_PREFIX = 42;

export const isValidSubstrateAddress = (address: string) => {
    try {
        encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));
        return true;
    } catch (error) {
        return false;
    }
};

export function getAllCredentialDefinitions(): Array<CredentialDefinition> {
    const credentialDefinitions: Array<CredentialDefinition> = Object.values(
        credentialDefinitionMap
    );

    if (!process.env.NX_BLACKLISTED_CREDENTIALS) {
        return credentialDefinitions;
    }
    try {
        const blacklistedIds = process.env.NX_BLACKLISTED_CREDENTIALS.split(',');
        return credentialDefinitions.filter(
            (definition) => !blacklistedIds.includes(definition.id)
        );
    } catch (err) {
        console.log('[warning] failed at parsing NX_BLACKLISTED_CREDENTIALS');
        return credentialDefinitions;
    }
}


export const getEncodedAddress: (
    address: HexString | Uint8Array | string,
    ss58prefix?: number
) => string = (
    address: HexString | Uint8Array | string,
    ss58prefix: number = CURRENT_NETWORK_SS58_PREFIX
) =>
    encodeAddress(
        isHex(address) ? hexToU8a(address) : decodeAddress(address),
        ss58prefix
    );

export const isValidEvmAddress = (address: string): boolean => {
    const _address = address.toLowerCase();
    if (/^(0x)?[0-9a-f]{40}$/.test(_address)) {
        return true;
    }
    return false;
};
export const isValidBitcoinAddress = (address: string): boolean => {
    return validate(address);
};

export function tellBitcoinAddressType(
    address: string
): 'BitcoinP2pkh' | 'BitcoinP2sh' | 'BitcoinP2wpkh' | 'BitcoinP2tr' {
    if (address.startsWith('1')) {
        return 'BitcoinP2pkh';
    } else if (address.startsWith('3')) {
        return 'BitcoinP2sh';
    } else if (address.startsWith('bc1q')) {
        return 'BitcoinP2wpkh';
    } else if (address.startsWith('bc1p')) {
        return 'BitcoinP2tr';
    } else {
        return 'BitcoinP2tr';
    }
}

export const scrollToBottom = (): void => {
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
    });
};

export function domainShorten(domain: string, prefixLength = 3): string {
    const domainPrefixPos = domain.lastIndexOf('.');
    let _prefixLength = prefixLength;
    const domainNamePrefix = domain.slice(domainPrefixPos);
    if (domainPrefixPos === 1) {
        return `*${domainNamePrefix}`;
    }
    if (domainPrefixPos === 2) {
        return `${domain.slice(0, 1)}*${domainNamePrefix}`;
    }
    if (domainPrefixPos / 2 <= prefixLength) {
        _prefixLength = Math.floor(domainPrefixPos / 2);
        // 'abcd.bnb'=>'a*d.bnb'
        if (domainPrefixPos / 2 === _prefixLength) {
            _prefixLength--;
        }
    }
    const domainName = domain.slice(0, domainPrefixPos);
    return `${domainName.slice(0, _prefixLength)}*${domainName.slice(
        -_prefixLength
    )}${domainNamePrefix}`;
}

export function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid MIME type in data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mime});
}

export function blobToFile(blob: Blob, fileName: string): File {
    return new File([blob], fileName, {type: blob.type});
}

export function calPassedTimeLabel(second: number): string {
    if (second <= 10) {
        return 'just now';
    } else if (second <= 60) {
        return `${second} seconds`;
    } else if (second <= 600) {
        const minutes = Math.floor(second / 60);
        return `${minutes} minutes ago`;
    } else {
        return 'a while ago';
    }
}

export function formatAddress(string: string): `0x${string}` | string {
    if (isValidSubstrateAddress(string)) {
        return string;
    }
    return string.startsWith('0x') ? (string as `0x${string}`) : `0x${string}`;
}

export function calRewardWithRank(rank: number): string {
    if (rank <= 10) {
        return '22.4';
    } else if (rank <= 50) {
        return `10`;
    } else if (rank <= 130) {
        return `5`;
    } else {
        return '-';
    }
}

export function isSameName(name1: string, name2: string): boolean {
    return (
        name1.replaceAll(' ', '').toLowerCase() ===
        name2.replaceAll(' ', '').toLowerCase()
    );
}

export function GetArrData(data: { drawPrice: number }): {
    integerArray: number[];
    decimalArray: number[];
} {
    const num = data.drawPrice.toFixed(2);

    const numStr = num.toString(); // 将数字转换成字符串

    const parts = numStr.split('.'); // 分割整数和小数部分

    // 补零处理
    const integerPart = parts[0].padStart(4, '0'); // 小数点前的数字补零至4位
    const result = integerPart + '.' + parts[1]; // 拼接整数部分和小数部分

    // 分割整数和小数部分
    const arrParts = result.split('.');

    // 将整数部分和小数部分的数字转换成数组
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const integerArray = arrParts[0].match(/\d/g).map(Number); // 使用正则表达式保留整数部分中的所有数字
    const decimalArray = arrParts[1].split('').map(Number);

    return {
        integerArray,
        decimalArray,
    };
}

export async function substrateSign(
    address: KeyringSigner | string,
    data: string,
    options?: SignOptions
): Promise<`0x${string}`> {
    const _options = {...defaultOptions, ...options};

    // We currently don't support keyring, but just in case this gets re-used
    if (!isString(address)) {
        // heads-up, no type passed.
        return u8aToHex(address.sign(u8aToU8a(data)));
    }

    // get signer
    let signer = _options.signer;
    if (!signer) {
        signer = await getGenericSigner(address);
    }

    const signRaw = signer.signRaw;

    if (!signRaw) {
        throw new Error('No signer exists with a signRaw interface.');
    }

    const {signature} = await signRaw({
        data,
        address: address,
        type: 'bytes',
    });

    return signature;
}

async function getGenericSigner(address: string): Promise<Signer> {
    const {web3FromAddress} = await import('@polkadot/extension-dapp');
    const injector = await web3FromAddress(address);

    return injector.signer;
}
