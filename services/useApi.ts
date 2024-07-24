import { useEffect, useState } from "react";

import { ApiPromise, WsProvider } from "@polkadot/api";
import { getChain } from "@litentry/chaindata";
import {
  identity,
  vc,
  sidechain,
  trusted_operations,
} from "@litentry/parachain-api";

import { State } from "./types";

const litentryProductionSpec = getChain("litentry-prod");
const litentryNetworkApiTypes = Object.assign(
  {},
  identity.types,
  vc.types,
  sidechain.types,
  trusted_operations.types,
);

/**
 * Connect to Litentry Parachain API
 */
export function useApi(): {
  status: State;
  api: ApiPromise | undefined;
  error: unknown;
} {
  const [status, setStatus] = useState<State>("idle");
  const [api, setApi] = useState<ApiPromise | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    setStatus("loading");

    connect()
      .then((api) => {
        setApi(api);
        setStatus("success");
      })
      .catch((error) => {
        setError(error);
        setStatus("error");
      });
  }, []);

  return { status, api, error };
}

async function connect(): Promise<ApiPromise> {
  // Create websocket provider using Litentry network RPCs
  const wsProvider = new WsProvider(
    litentryProductionSpec.rpcs.map((rpc) => rpc.url),
  );
  // Create API instance using Litentry network types
  const api = await ApiPromise.create({
    provider: wsProvider,
    types: litentryNetworkApiTypes,
  });

  // log chain information
  getSubstrateNetworkProperties(api).then((networkProperties) => {
    console.log(
      `Connected to ${networkProperties.systemChain}`,
      networkProperties,
    );
  });

  return api;
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
    systemChain: (systemChain || "<unknown>").toString(),
    systemChainType: (systemChainType || "<unknown>").toString(),
    systemName: systemName.toString(),
    systemVersion: systemVersion.toString(),
  };
}
