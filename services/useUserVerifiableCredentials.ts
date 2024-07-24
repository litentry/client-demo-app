import type { VerifiableCredential } from "@litentry/vc-sdk";
import type {
  CredentialDefinition,
  CredentialDefinitionId,
  CredentialDefinitionPayload,
} from "@litentry/credential-definitions";
import { credentialDefinitionMap } from "@litentry/credential-definitions";

export type UserVerifiableCredentialRecord = {
  // User VC in raw JSON string format.
  rawCredentialText: string;
  // Parsed VC.
  parsedCredential: VerifiableCredential;
  // The CredentialDefinition used to claim the VC
  definition: CredentialDefinition;
  // Whether the VC is claimed by current IDHub credential definitions
  claimed: boolean;
  // The payload of the VC if claimed.
  payload: CredentialDefinitionPayload<CredentialDefinitionId>;
};

export type VaultCredentialList = Map<
  CredentialDefinitionId,
  UserVerifiableCredentialRecord
>;

// Filtering functions that can be used to filter the returned Verifiable Credentials.
type FilterFn = (record: UserVerifiableCredentialRecord) => boolean;

const filtersFunctions: Record<"all" | "claimed", FilterFn> = {
  all: () => true,
  claimed: (record: UserVerifiableCredentialRecord) => record.claimed,
};

export type Options = {
  filter: keyof typeof filtersFunctions;
};

const defaultOptions: Options = {
  filter: "all",
};

/**
 *
 * Load the user's Verifiable Credentials from the vault and resolve its claim status based on the
 * identity hub credential definitions from `@idhub/credential-definitions`. The parsedVc as well as the
 * definition and the claim's payload are returned too.
 *
 * Please note that this will *only* return the Verifiable Credentials the user has generated,
 * both claimed and unclaimed. For an extensive list of Credential Definitions,
 * check `@idhub/credential-definitions` or `useUserScore()`.
 *
 * @see `useUserScore` if anything score evaluation is needed.
 *
 * @example
 * ```typescript
 * const { data, status } = useUserVerifiableCredentials({ filter: 'claimed' });
 *
 * if (status === 'success') {
 *  for (const [definitionId, record] of data.entries()) {
 *    console.log(`Credential definition ${definitionId} is claimed`);
 *    console.log({ vc: record.rawCredentialText, parsedVc: record.parsedCredential });
 *  }
 * }
 * ```
 */

export function getAllCredentialDefinitions(): Array<CredentialDefinition> {
  const credentialDefinitions: Array<CredentialDefinition> = Object.values(
    credentialDefinitionMap,
  );

  if (!process.env.NX_BLACKLISTED_CREDENTIALS) {
    return credentialDefinitions;
  }
  try {
    const blacklistedIds = process.env.NX_BLACKLISTED_CREDENTIALS.split(",");
    return credentialDefinitions.filter(
      (definition) => !blacklistedIds.includes(definition.id),
    );
  } catch (err) {
    console.log("[warning] failed at parsing NX_BLACKLISTED_CREDENTIALS");
    return credentialDefinitions;
  }
}
