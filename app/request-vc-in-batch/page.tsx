'use client';
import {useEffect, useState} from 'react';
import {NextSeo} from 'next-seo';
import {u8aToHex, u8aToString} from '@polkadot/util';
import {Button, Text} from '@chakra-ui/react';

import {useSubstrateApi} from '@/services/useSubstrateAPI';
import {getAllCredentialDefinitions} from '@/services/useUserVerifiableCredentials';
import {ApiPromise} from "@polkadot/api";
import * as shieldingKeyUtils from '@/services/shielding-key.utils';
import type {Codec} from '@polkadot/types-codec/types';
import type {HexString, U8aLike} from '@polkadot/util/types';
import type {CorePrimitivesAssertion} from '@polkadot/types/lookup';
import {
    request,
    createKeyAesOutputType,
} from '@litentry/enclave';
import type {
    LitentryIdentity,
    Web3Network,
    KeyAesOutput,
} from '@litentry/chain-types';

import type {CredentialDefinitionId} from "@litentry/credential-definitions";
import {getWalletBySource} from "@talismn/connect-wallets";
import {decodeAddress} from "@polkadot/util-crypto";
import {substrateSign} from "@/services/util";

const allCredentialDefinitions = getAllCredentialDefinitions().slice(0, 40);
const assertions: Record<string, any>[] = allCredentialDefinitions.map(
    // @ts-ignore
    (credentialDefinition) => {
        return {
            [credentialDefinition.assertion.id]:
            credentialDefinition.assertion.params,
        };
    }
);
const assertionsVcIdMap: Array<string> = allCredentialDefinitions.map(
    // @ts-ignore
    (credentialDefinition) => {
        return credentialDefinition.id;
    }
);
console.log(assertionsVcIdMap);


export default function TestRequestBatchVCPlayground(): JSX.Element | null {
    const {data: api, status: apiStatus} = useSubstrateApi();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [progress, setProgress] = useState<Array<string>>([]);

    useEffect(() => {
        if (localStorage.getItem(`shieldingKey`)) {
            return;
        }
        shieldingKeyUtils.generate().then(shieldingKey => {
            shieldingKeyUtils.encode(
                `pseudoPassword`,
                shieldingKey
            ).then(({encoded, encoding}) => {
                localStorage.setItem(`shieldingKey`, JSON.stringify({
                    encoded,
                    encoding,
                }))
            })

        })
    }, []);

    if (
        apiStatus !== 'success' ||
        !api
    ) {
        return <h1>Loading rpc API</h1>;
    }


    const request = async (): Promise<void> => {
        setStatus('loading');
        setProgress([]);

        const walletName = `polkadot-js`
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

        const signMessage = async ({rawMessage}: { rawMessage: string }) =>
            substrateSign(u8aToHex(account), rawMessage, {
                signer,
                type: 'bytes',
            });

        const {payloadToSign, sendAndWatch} = await requestBatchVerifiableCredentials(
            {assertions},
            {
                api,
                assertionsVcIdMap,
                address: curAccount.address,
            }
        );

        const signature = await signMessage({
            rawMessage: payloadToSign,
        });

        await sendAndWatch(
            {
                signedPayload: signature,
            },
            (error, {vcPayload, index, partialResult}) => {
                setProgress((prev) => [
                    ...prev,
                    `${partialResult.length}/${
                        assertions.length
                    } Received response for Assertion #${index + 1}`,
                ]);

                console.log({error, vc: u8aToString(vcPayload), index});
            }
        );

        setStatus('success');
    };

    return (
        <div>
            <NextSeo title="Test: Request a batch of VCs" nofollow noindex/>
            <Text variant="body1bold" mb={1}>
                Test: Request a batch of VCs
            </Text>
            <Text mb={1}>
                Open DevTools to see the console log for the results of the request.
            </Text>
            <Button onClick={request} isDisabled={status === 'loading'}>
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
    }
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
            }
        ) => void
    ) => Promise<void>;
}> {
    const assertions: Array<CorePrimitivesAssertion> =
        credentialDescriptor.assertions.map((assertionLike) => {
            return context.api.createType('CorePrimitivesAssertion', assertionLike);
        });

    const {payloadToSign, send, txHash} = await request.requestBatchVC(
        context.api,
        {
            who: context.address,
            assertions,
        }
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
            }
        ) => void
    ) => {

        console.log(
            `Sending request to the Enclave with transaction hash: ${txHash}`
        );

        const {vcPayloads} = await send({signedPayload}, (error, data) => {
            const {vcPayload} = data;

            if (vcPayload.length > 0) {
                // encrypt vcPayload with local key for local storage
                const nonce = shieldingKeyUtils.generateNonce12();
                encrypt({
                    cleartext: vcPayload,
                    nonce,
                }).then(({ciphertext: encryptedVcPayload}) => {
                    // describe the encrypted vcPayload as KeyAesOutput
                    const encryptedCredential = createKeyAesOutputType(
                        context.api.registry,
                        {
                            ciphertext: u8aToHex(encryptedVcPayload),
                            nonce: u8aToHex(nonce),
                            aad: '0x',
                        }
                    );
                    addCredential({
                        key: context.assertionsVcIdMap[data.index] as CredentialDefinitionId,
                        encryptedCredential,
                        api: context.api,
                    }).then(() => {
                        console.log(`VC stored: `, context.assertionsVcIdMap[data.index]);
                    });
                });
            }

            // execute the subscribe function
            subscribe(error, data);
        });

        // @TODO remove`
        // Logging the response
        console.log(
            '[vault::requestBatchVerifiableCredentials]: Received response from the Enclave:',
            vcPayloads
        );
    };

    return {
        payloadToSign,
        sendAndWatch,
    };
}

async function encrypt(args: {
    cleartext: Uint8Array;
    nonce: Uint8Array;
}): Promise<{ ciphertext: Uint8Array }> {

    const keyData = localStorage.getItem(`shieldingKey`);
    const {encoded, encoding} = JSON.parse(keyData ?? "{}");
    const shieldingKey = await shieldingKeyUtils.decode({encoded, encoding}, `pseudoPassword`)
    return shieldingKeyUtils.encrypt(args, shieldingKey);
}

async function addCredential(args: {
    key: CredentialDefinitionId;
    encryptedCredential: KeyAesOutput;
    api: ApiPromise;
}): Promise<void> {
    const {key, encryptedCredential, api} = args;

    const {cleartext: rawCredential} = await decrypt({
        ciphertext: encryptedCredential.ciphertext,
        nonce: encryptedCredential.nonce,
    });

    console.log('rawCredential', u8aToString(rawCredential));
    // await this.validateVc(api, {vcString: u8aToString(rawCredential)});
    // this.#data.credentials.set(key, encryptedCredential.toHex());

    // await this.persistCredentials(
    //     new Map([[key, encryptedCredential.toHex()]])
    // );
}

async function decrypt(args: {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
}): Promise<{ cleartext: Uint8Array }> {
    const keyData = localStorage.getItem(`shieldingKey`);
    const {encoded, encoding} = JSON.parse(keyData ?? "{}");
    const shieldingKey = await shieldingKeyUtils.decode({encoded, encoding}, `pseudoPassword`)
    return shieldingKeyUtils.decrypt(args, shieldingKey);
}