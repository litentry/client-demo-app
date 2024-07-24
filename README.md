# Litentry Client Demo App

This demo application features requesting three Verifiable Credentials using Litentry Network API and its Client SDK for JavaScript.

## Requirements

- Node.js 20+
- PNPM 7+
- [Polkadot-js Wallet Extension](https://polkadot.js.org/extension/) with at least one account.

## Getting Started

First, install dependencies using PNPM

```bash
pnpm install
```

Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Similarly, open the browser's DevTools to see the console log of the request among other useful debug information.

During the processing, you will be asked to connect your Polkadot-js wallet, and sign a transaction to request two verifiable credentials to Litentry Network.

## Learn More

To learn more about Litentry, take a look at the following resources:

- [Client-SDK Documentation](https://docs.litentry.com/parachain/sdk-documentation) - learn about Litentry's Client SDK features and API.
- [Litentry Documentation](https://docs.litentry.com) - Official documentation of Litentry Protocol.
- [Litentry Website](https://litentry.com) - Official website.
