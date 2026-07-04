# ERC-20 Token Frontend

A Next.js web app for deploying and interacting with a custom ERC-20 token contract on Ethereum (Sepolia testnet), backed by a The Graph subgraph for indexed event data.

## Features

- **Deploy** a new ERC-20 token (name, symbol, initial supply) directly from the browser
- **Read** token metadata — name, symbol, decimals, total supply
- **Transfer** tokens to any address
- **Approve** a spender and execute `transferFrom`
- **Check balances** and **allowances** for any address
- **Live event feed** — Transfer & Approval events indexed via The Graph subgraph

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Web3 | ethers.js v6 |
| Indexer | The Graph (subgraph on Sepolia) |
| Notifications | Sonner |

## Project Structure

```
├── app/                    # Next.js app router (layout, global styles)
├── components/
│   └── Contract-Interaction.tsx   # Main UI — deploy, read, write, events
├── lib/
│   ├── subgraph.ts         # useSubgraphData hook (GraphQL polling)
│   └── utils.ts            # Tailwind class helper
├── erc-token-contract/     # The Graph subgraph
│   ├── src/token.ts        # Event handlers (AssemblyScript)
│   ├── schema.graphql      # GraphQL schema (Transfer, Approval entities)
│   └── subgraph.yaml       # Subgraph manifest
└── config.ts               # Contract ABI + bytecode
```

## Contract

- **Network:** Sepolia testnet
- **Address:** `0x109916Bcc350C331c48Bef12D6ADA1a640758E64`
- **Standard:** ERC-20 (transfer, approve, transferFrom, balanceOf, allowance)

## Getting Started

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and connect MetaMask to **Sepolia**.

## Subgraph

The `erc-token-contract/` directory contains a The Graph subgraph that indexes `Transfer` and `Approval` events from the deployed contract. The frontend polls the subgraph after each transaction to reflect on-chain state in near real-time.
