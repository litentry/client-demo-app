"use client";

// ambience files for polkadot-js type augmentation
import "@litentry/sidechain-api";
import "@litentry/parachain-api";

import { useEffect, useState } from "react";
import {
  Text,
  Heading,
  Box,
  Button,
  Icon,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import {
  getWalletBySource,
  Wallet,
  type WalletAccount,
} from "@talismn/connect-wallets";
import { decodeAddress } from "@polkadot/util-crypto";
import { Assertion, vc } from "@litentry/parachain-api";
import { u8aToString } from "@polkadot/util";
import type { Signer } from "@polkadot/types/types";

import { createLitentryIdentityType, request } from "@litentry/enclave";

import { useApi } from "@/services/useApi";
import type { Status } from "@/services/types";

export default function Home() {
  const { status: apiStatus, api } = useApi();
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (apiStatus !== "success" || !api) {
      // wait for api to be ready
      return;
    }
  }, [apiStatus, api]);

  const submit = async () => {
    // make TS happy. UI only allows the action when api is ready
    if (!api) {
      console.error("API not ready");
      return;
    }

    setStatus("loading");

    const account: WalletAccount = await getWalletAccount();
    console.log(`generating request for account ${account.address}`);

    const who = createLitentryIdentityType(api.registry, {
      addressOrHandle: account.address,
      type: "Substrate",
    });
    const assertions: Assertion[] = [
      // LIT-Holder credential
      api.createType("Assertion", {
        A4: "10.00",
      }),
      // DOT-Holder credential
      api.createType("Assertion", {
        A7: "10.00",
      }),
    ];

    const { payloadToSign, send, txHash } = await request.requestBatchVC(api, {
      who,
      assertions,
    });

    console.log(`awaiting for user signature...`);
    const signer = account.wallet!.signer as Signer;
    const { signature } = await signer.signRaw!({
      data: payloadToSign,
      address: account.address,
      type: "bytes",
    });

    console.log(`sending request to Litentry Network with hash ${txHash}...`);
    const { vcPayloads } = await send({
      signedPayload: signature,
    });

    console.log(`✨ success. received VC payloads:`);
    console.log(
      vcPayloads.map((vcOrError) => {
        if (vcOrError instanceof Error) {
          return vcOrError.message;
        }

        return u8aToString(vcOrError);
      }),
    );

    setStatus("success");
  };

  return (
    <main>
      <Heading fontSize="4xl" as="h2">
        Litentry Client Demo App
      </Heading>
      <Text color="gray.600">
        This demo application features requesting three Verifiable Credentials
        using Litentry Network API and its Client SDK for JavaScript. You will
        be asked to connect your Polkadot.js wallet and sign the request.
      </Text>
      <Box
        bg="green.700"
        color="white"
        p={8}
        borderRadius={18}
        marginTop={10}
        marginBottom={8}
      >
        <Text as="h3" fontSize="x-large" marginBottom={6}>
          <Icon name="check" fill="green.300" marginRight={1}>
            <path d="M12 0a12 12 0 1012 12A12.013 12.013 0 0012 0zm8.647 7h-3.221a19.676 19.676 0 00-2.821-4.644A10.031 10.031 0 0120.647 7zM16.5 12a10.211 10.211 0 01-.476 3H7.976a10.211 10.211 0 01-.476-3 10.211 10.211 0 01.476-3h8.048a10.211 10.211 0 01.476 3zm-7.722 5h6.444A19.614 19.614 0 0112 21.588 19.57 19.57 0 018.778 17zm0-10A19.614 19.614 0 0112 2.412 19.57 19.57 0 0115.222 7zM9.4 2.356A19.676 19.676 0 006.574 7H3.353A10.031 10.031 0 019.4 2.356zM2.461 9H5.9a12.016 12.016 0 00-.4 3 12.016 12.016 0 00.4 3H2.461a9.992 9.992 0 010-6zm.892 8h3.221A19.676 19.676 0 009.4 21.644 10.031 10.031 0 013.353 17zm11.252 4.644A19.676 19.676 0 0017.426 17h3.221a10.031 10.031 0 01-6.042 4.644zM21.539 15H18.1a12.016 12.016 0 00.4-3 12.016 12.016 0 00-.4-3h3.437a9.992 9.992 0 010 6z" />
          </Icon>{" "}
          System is {apiStatus === "success" ? "ready" : "loading"}
        </Text>
        <Button
          size="lg"
          bg="white"
          borderColor="white"
          onClick={submit}
          isLoading={apiStatus !== "success" || status === "loading"}
          loadingText="Processing..."
        >
          Generate
        </Button>
      </Box>

      <Alert status="info">
        <AlertIcon />
        Open your Browser&apos;s DevTools to see the console log for the results
        of the request.
      </Alert>
    </main>
  );
}

/**
 * Connects to Polkadot-js Wallet and returns the first account
 */
async function getWalletAccount(): Promise<WalletAccount> {
  const wallet = getWalletBySource(`polkadot-js`);

  if (!wallet) {
    throw new Error(`Polkadot-js not installed`);
  }

  await wallet.enable(`LitentryClientDemo`);
  const accounts = await wallet.getAccounts();

  return accounts[0];
}
