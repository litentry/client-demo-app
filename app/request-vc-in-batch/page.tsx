"use client";
import { useState } from "react";
import { NextSeo } from "next-seo";
import { u8aToHex, u8aToString } from "@polkadot/util";
import { Button, Text } from "@chakra-ui/react";

import { useSubstrateApi } from "@/services/useSubstrateAPI";
import { getAllCredentialDefinitions } from "@/services/useUserVerifiableCredentials";
import { ApiPromise } from "@polkadot/api";
import type { Codec } from "@polkadot/types-codec/types";
import type { U8aLike } from "@polkadot/util/types";
import type { CorePrimitivesAssertion } from "@polkadot/types/lookup";
import { request } from "@litentry/enclave";
import { getWalletBySource } from "@talismn/connect-wallets";
import { decodeAddress } from "@polkadot/util-crypto";
import { substrateSign } from "@/services/util";

const allCredentialDefinitions = getAllCredentialDefinitions().slice(0, 10);
const assertions: Record<string, any>[] = allCredentialDefinitions.map(
  // @ts-ignore
  (credentialDefinition) => {
    return {
      [credentialDefinition.assertion.id]:
        credentialDefinition.assertion.params,
    };
  },
);
const assertionsVcIdMap: Array<string> = allCredentialDefinitions.map(
  // @ts-ignore
  (credentialDefinition) => {
    return credentialDefinition.id;
  },
);
console.log(assertionsVcIdMap);

export default function TestRequestBatchVCPlayground(): JSX.Element | null {
  const { data: api, status: apiStatus } = useSubstrateApi();
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [progress, setProgress] = useState<Array<string>>([]);

  if (apiStatus !== "success" || !api) {
    return <h1>Loading rpc API</h1>;
  }

  const request = async (): Promise<void> => {
    setStatus("loading");
    setProgress([]);

    const walletName = `polkadot-js`;
    const wallet = getWalletBySource(walletName);
    if (!wallet) {
      alert(`Polkadot-js not installed`);
      return;
    }
    await wallet.enable(`LitentryClientDemo`);
    const accounts = await wallet.getAccounts();
    const curAccount = accounts[0];
    const signer = wallet.signer;
    const account = decodeAddress(curAccount.address);

    const signMessage = async ({ rawMessage }: { rawMessage: string }) =>
      substrateSign(u8aToHex(account), rawMessage, {
        signer,
        type: "bytes",
      });

    const { payloadToSign, sendAndWatch } =
      await requestBatchVerifiableCredentials(
        { assertions },
        {
          api,
          assertionsVcIdMap,
          address: curAccount.address,
        },
      );

    const signature = await signMessage({
      rawMessage: payloadToSign,
    });

    await sendAndWatch(
      {
        signedPayload: signature,
      },
      (error, { vcPayload, index, partialResult }) => {
        setProgress((prev) => [
          ...prev,
          `${partialResult.length}/${
            assertions.length
          } Received response for Assertion #${index + 1}`,
        ]);

        console.log({ error, vc: u8aToString(vcPayload), index });
      },
    );

    setStatus("success");
  };

  return (
    <div>
      <NextSeo title="Test: Request a batch of VCs" nofollow noindex />
      <Text variant="body1bold" mb={1}>
        Test: Request a batch of VCs
      </Text>
      <Text mb={1}>
        Open DevTools to see the console log for the results of the request.
      </Text>
      <Button onClick={request} isDisabled={status === "loading"}>
        Request {assertions.length} VCs
      </Button>
      {progress.map((p, i) => (
        <Text mt={1} key={i}>
          {p}
        </Text>
      ))}
    </div>
  );
}

async function requestBatchVerifiableCredentials(
  credentialDescriptor: {
    assertions: Record<
      string,
      | string
      | Array<string | number | Codec | U8aLike>
      | Record<string, unknown>
    >[];
  },
  context: {
    address: string;
    assertionsVcIdMap: Array<string>;
    api: ApiPromise;
  },
): Promise<{
  payloadToSign: string;
  sendAndWatch: (
    args: { signedPayload: string },
    subscribe: (
      error: Error | null,
      data: {
        vcPayload: Uint8Array;
        index: number;
        partialResult: Array<unknown>;
      },
    ) => void,
  ) => Promise<void>;
}> {
  const assertions: Array<CorePrimitivesAssertion> =
    credentialDescriptor.assertions.map((assertionLike) => {
      return context.api.createType("CorePrimitivesAssertion", assertionLike);
    });

  const { payloadToSign, send, txHash } = await request.requestBatchVC(
    context.api,
    {
      who: context.address,
      assertions,
    },
  );

  const sendAndWatch = async (
    {
      signedPayload,
    }: {
      signedPayload: string;
    },
    subscribe: (
      error: Error | null,
      data: {
        vcPayload: Uint8Array;
        index: number;
        partialResult: Array<unknown>;
      },
    ) => void,
  ) => {
    console.log(
      `Sending request to the Enclave with transaction hash: ${txHash}`,
    );

    send({ signedPayload }, (error, data) => {
      const { vcPayload } = data;

      if (vcPayload.length > 0) {
        console.log(
          `[requestBatchVerifiableCredentials]: Received response from the Enclave:`,
          u8aToString(vcPayload),
        );
      }

      // execute the subscribe function
      subscribe(error, data);
    });
  };

  return {
    payloadToSign,
    sendAndWatch,
  };
}
