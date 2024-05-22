export const SUPPORTED_NETWORKS = {
    'litentry-local': {
        name: 'Litentry Local Network',
        provider: 'ws://localhost:9944', // Local node
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry local development network, including relaychains and parachain run by Litentry',
    },
    'litentry-dev': {
        name: 'Litentry Development Network',
        provider: 'wss://tee-dev.litentry.io',
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry development network, including relaychains and parachain run by Litentry',
    },
    'litentry-internal': {
        name: 'Litentry Development Network',
        provider: 'wss://tee-internal.litentry.io',
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry internal request-vc-in-batch network, including relaychains and parachain run by Litentry',
    },
    'litentry-staging': {
        name: 'Litentry Staging Network',
        provider: 'wss://tee-staging.litentry.io', // Parachain + Enclave (TEE)
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry staging network, including relaychains and parachain run by Litentry',
    },
    'litentry-rococo': {
        name: 'Litentry Rococo Network',
        provider: 'wss://rpc.rococo-parachain-sg.litentry.io',
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry Rococo network, including relaychains and parachain run by Litentry',
    },
    'litentry-prod': {
        name: 'Litentry Pre Production Network',
        provider: 'wss://tee-prod.litentry.io',
        ss58prefix: 42,
        description:
            'Currently you are running on Litentry Rococo network, including relaychains and parachain run by Litentry',
    },
    litentry: {
        name: 'Litentry Network',
        provider: 'wss://rpc.litentry-parachain.litentry.io',
        ss58prefix: 31,
        description:
            'Currently you are running on Litentry main network, including relaychains and parachain run by Litentry',
    },
};
export type Network = keyof typeof SUPPORTED_NETWORKS;

/** @todo https://github.com/litentry/identity-hub/issues/426 */
function validateNetwork(network: string | undefined): Network {
    if (!network) {
        return 'litentry-dev';
    }

    if (
        network !== 'litentry-prod' &&
        network !== 'litentry-dev' &&
        network !== 'litentry-internal' &&
        network !== 'litentry-staging' &&
        network !== 'litentry-rococo' &&
        network !== 'litentry' &&
        network !== 'litentry-local'

    ) {
        throw new Error(
            `Invalid network value in "NX_PARACHAIN_NETWORK": ${network}. Valid values are ${Object.keys(
                SUPPORTED_NETWORKS
            ).join(', ')}`
        );
    }

    return network;
}

export const CURRENT_NETWORK: Network = validateNetwork(
    process.env.NX_PARACHAIN_NETWORK
);

export const CURRENT_NETWORK_SS58_PREFIX: number =
    SUPPORTED_NETWORKS[CURRENT_NETWORK].ss58prefix;

export const CURRENT_NETWORK_PROVIDER =
    SUPPORTED_NETWORKS[CURRENT_NETWORK].provider;

export const CURRENT_NETWORK_NAME = SUPPORTED_NETWORKS[CURRENT_NETWORK].name;

export const CURRENT_NETWORK_DESC =
    SUPPORTED_NETWORKS[CURRENT_NETWORK].description;
