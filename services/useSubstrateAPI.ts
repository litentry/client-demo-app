import {
    identityManagement,
    trustedCalls,
    vcManagement,
} from '@litentry/chain-types';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {useQuery} from 'react-query';
import {CURRENT_NETWORK, SUPPORTED_NETWORKS} from '@/config/network';

import type {ProviderInterfaceEmitted} from '@polkadot/rpc-provider/types';
import type {UseQueryResult} from 'react-query';
import type {Network} from '@/config/network';

export const queryKey = ['substrate-rpc'] as const;

const litentryNetworkApiTypes = {
    ...trustedCalls.types,
    ...identityManagement.types,
    ...vcManagement.types,
};

type UseSubstrateApiOptions = {
    network: Network;
};

const defaultOptions: UseSubstrateApiOptions = {
    network: CURRENT_NETWORK,
};

/**
 * Connect to Substrate API and hold the connection in-memory cache.
 */
export function useSubstrateApi(options?: {
    // types inlined for better typescript autocomplete support
    network?: 'litentry-staging';
    onSubstrateApiStatusChange?: (
        status: ProviderInterfaceEmitted,
        value?: Error
    ) => void;
}): UseQueryResult<ApiPromise> {
    return useQuery(
        queryKey,
        async function createApi(): Promise<ApiPromise> {
            const _options = {...defaultOptions, ...options};

            if (!SUPPORTED_NETWORKS[_options.network]) {
                throw new Error(`Network ${_options.network} not supported`);
            }

            const network = SUPPORTED_NETWORKS[_options.network];
            const wsProvider = new WsProvider(network.provider);

            // add ws provider network status change callback for background detection
            const onSubstrateApiStatusChange = _options.onSubstrateApiStatusChange;
            if (onSubstrateApiStatusChange) {
                wsProvider.on('connected', () =>
                    onSubstrateApiStatusChange('connected')
                );
                wsProvider.on('disconnected', () =>
                    onSubstrateApiStatusChange('disconnected')
                );
                wsProvider.on('error', (value) =>
                    onSubstrateApiStatusChange('error', value)
                );
            }

            console.log(`Connecting to Substrate node at ${network.provider}...`);

            const api = await ApiPromise.create({
                provider: wsProvider,
                // Hardcoded for now until we need to support non-litentry networks
                types: litentryNetworkApiTypes,
            });

            // Note that we are not waiting for this logging info to resolve as it is informational only
            getSubstrateNetworkProperties(api).then((networkProperties) => {
                console.log(
                    `Connected to ${networkProperties.systemChain}`,
                    networkProperties
                );
            });

            return api;
        },
        {
            // Disable refetching
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            retry: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
        }
    );
}

async function getSubstrateNetworkProperties(api: ApiPromise): Promise<{
    ss58Format: number | undefined;
    tokenDecimals: number[];
    tokenSymbol: string[];
    systemChain: string;
    systemChainType: string;
    systemName: string;
    systemVersion: string;
}> {
    const [systemChain, systemChainType, systemName, systemVersion] =
        await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.chainType(),
            api.rpc.system.name(),
            api.rpc.system.version(),
        ]);

    return {
        ss58Format: api.registry.chainSS58,
        tokenDecimals: api.registry.chainDecimals,
        tokenSymbol: api.registry.chainTokens,
        systemChain: (systemChain || '<unknown>').toString(),
        systemChainType: (systemChainType || '<unknown>').toString(),
        systemName: systemName.toString(),
        systemVersion: systemVersion.toString(),
    };
}
