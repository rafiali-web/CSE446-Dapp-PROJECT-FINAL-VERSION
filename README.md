
# BountyPulse — CSE446 DApp Final Project

> **Decentralized Micro-Bounty & Escrow DApp**  
> CSE446 — Summer 2026

BountyPulse is a local Ethereum DApp that connects **Solidity + Foundry + Anvil + MetaMask + Ethers.js + Pinata/IPFS** to provide a decentralized micro-bounty and escrow workflow.

The final repository contains the `BountyPulse.sol` smart contract, Foundry deployment/test files, frontend files, ABI, and a small Pinata upload server.

## 🔗 Project Repository

[**CSE446-Dapp-PROJECT-FINAL-VERSION**](https://github.com/rafiali-web/CSE446-Dapp-PROJECT-FINAL-VERSION)

## 🧩 Main Technologies

- **Solidity 0.8.x** — smart contract
- **Foundry / Forge** — compilation, testing and deployment
- **Anvil** — local Ethereum network
- **MetaMask** — wallet connection
- **Ethers.js** — frontend blockchain interaction
- **Pinata / IPFS** — decentralized file and metadata storage
- **Node.js / Express / Multer** — Pinata upload server
- **HTML / CSS / JavaScript** — frontend

## 📁 Important Project Structure

```text
CSE446-Dapp-PROJECT-FINAL-VERSION/
├── src/
│   └── BountyPulse.sol
├── test/
│   └── BountyPulse.t.sol
├── script/
│   ├── DeployBountyPulse.s.sol
│   └── frontend/
│       ├── index.html
│       ├── app.js
│       ├── style.css
│       ├── BountyPulse.json
│       └── ipfsHelper.js
├── pinata-server/
│   └── server.js
├── abi/
├── foundry.toml
└── README.md
```

## 🚀 Implementation Checkpoints & Task Checklist

### ✅ Checkpoint 1 — Environment
**[0.0 Marks — Prerequisite]**

- Anvil running locally.
- MetaMask connected to the **BountyPulse Local** network.
- Chain ID confirmed as **31337**.
- Pre-funded local test account imported into MetaMask.
- Pinata upload service configured and active.

The project frontend also checks that the connected network is Chain ID `31337` before loading the contract.

#### Evidence

![Checkpoint 1 — Local environment](docs/checkpoints/01.jpg)

![Checkpoint 1 — MetaMask local network](docs/checkpoints/05.jpg)

![Checkpoint 1 — Local funded ETH account](docs/checkpoints/06.jpg)

> **Security note:** screenshots containing private keys or Pinata credentials have been redacted before being included in this README.

---

### ✅ Checkpoint 2 — Contract Deployment
**[1.5 Marks]**

- `BountyPulse.sol` compiled and tested using Foundry.
- Deployment performed using `forge script`.
- Contract deployed to the local Anvil chain.
- Chain ID: **31337**.
- Deployment output shows gas price, total gas estimate and deployment cost.
- The deployed contract address used by the final frontend is:
  `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- The deployer is stored as the contract **arbiter**.
- Foundry tests passed successfully.

#### Test Evidence

The test run shows:

```text
28 tests passed
0 failed
0 skipped
```

![Checkpoint 2 — Foundry tests and deployment](docs/checkpoints/09.jpg)

#### Deployment Evidence

![Checkpoint 2 — Forge deployment and gas metrics](docs/checkpoints/26.jpg)

![Checkpoint 2 — Arbiter verification](docs/checkpoints/27.jpg)

![Checkpoint 2 — Deployment transaction](docs/checkpoints/28.jpg)

---

### 💾 Payment Logic Verification

The contract uses a **2% platform fee** and sends the remaining **98%** to the selected freelancer after work approval.

For the demonstrated `0.800 ETH` bounty:

```text
Total escrow       = 0.800 ETH
Platform fee (2%)  = 0.016 ETH
Freelancer (98%)   = 0.784 ETH
```

This matches the evidence from the completed transaction.

![Payment distribution — 0.784 ETH / 0.016 ETH](docs/checkpoints/30.jpg)

The claim transaction also demonstrates that the freelancer's `0.784 ETH` becomes withdrawable before being claimed.

![Freelancer funds waiting to be claimed](docs/checkpoints/29.jpg)

---

### ✅ Checkpoint 3 — IPFS Metadata Pipeline
**[1.0 Mark]**

The DApp uses Pinata/IPFS for decentralized file storage.

The pipeline is:

```text
Select File
    ↓
Frontend
    ↓
Pinata Upload Server
    ↓
Pinata / IPFS
    ↓
CID returned
    ↓
CID inserted into bounty metadata
    ↓
CID stored by BountyPulse.sol
```

The frontend displays the returned CID and uses it as the bounty metadata reference.

#### Pinata Upload + CID Evidence

![Checkpoint 3 — Pinata upload and CID](docs/checkpoints/25.jpg)

![Checkpoint 3 — Frontend receives CID from Pinata](docs/checkpoints/31.jpg)

The final frontend also demonstrates the CID being attached to a posted bounty.

![Checkpoint 3 — CID used in blockchain bounty metadata](docs/checkpoints/32.jpg)

> Pinata API keys, secrets and JWTs are **not included** in this README. Any credential screenshots from the original evidence were redacted for security.

---

### ✅ Checkpoint 4 — Feed & Escrow Flow
**[1.0 Mark]**

The completed DApp supports the complete bounty lifecycle:

```text
Client registers
      ↓
Client uploads bounty details to IPFS
      ↓
Client posts bounty
      ↓
Freelancer places bid
      ↓
Client selects freelancer
      ↓
Client funds bounty with ETH
      ↓
Freelancer uploads completed work to IPFS
      ↓
Freelancer submits work CID
      ↓
Client approves work
      ↓
98% → Freelancer withdrawable balance
2%  → Arbiter/platform fee
      ↓
Freelancer clicks "Claim Funds"
```

#### Bounty Creation / Feed Evidence

![Checkpoint 4 — Post and view bounty](docs/checkpoints/32.jpg)

#### Bid, Funding and Work Submission Evidence

![Checkpoint 4 — Bid, fund and submit work](docs/checkpoints/33.jpg)

#### Escrow Transaction Evidence

![Checkpoint 4 — Successful blockchain transaction](docs/checkpoints/28.jpg)

#### Pull-Payment / Claim Evidence

The freelancer's payment is held as a withdrawable balance and is released through the `claimFunds()` pull-payment function.

![Checkpoint 4 — Freelancer funds waiting](docs/checkpoints/29.jpg)

The demonstrated payment split is:

```text
Bounty funded:       0.800 ETH
Freelancer balance:  0.784 ETH
Platform fee:        0.016 ETH
```

![Checkpoint 4 — Exact payment calculation](docs/checkpoints/30.jpg)

---

### ✅ Checkpoint 5 — Live Event Auto-Sync
**[0.5 Marks]**

The final frontend implements live blockchain event synchronization.

When the client approves work:

```text
Window 1 — Client
        |
        | approveWork()
        ↓
BountyPulse Contract
        |
        | emits WorkApproved
        ↓
Window 2 — Freelancer
        |
        ↓
Unclaimed Earnings refresh automatically
```

The frontend listens for the Solidity `WorkApproved` event and refreshes the freelancer's withdrawable balance when the event belongs to the connected freelancer.

The implementation also includes a background balance-refresh fallback so the UI does not require a page reload.

#### Implementation Evidence

![Checkpoint 5 — Work approval interface](docs/checkpoints/33.jpg)

The final frontend code contains:

- `WorkApproved` event listener
- freelancer-address matching
- automatic `getWithdrawableBalance()` refresh
- live "Unclaimed Earnings" UI update
- `FundsClaimed` event handling
- fallback background balance refresh

See [`script/frontend/app.js`](https://github.com/rafiali-web/CSE446-Dapp-PROJECT-FINAL-VERSION/blob/master/script/frontend/app.js).

> **Evidence note:** the supplied checkpoint PDF does not contain a dedicated side-by-side screenshot of both browser windows after the automatic update. The live-sync implementation itself is present in the final frontend code.

---

# 🧪 Smart Contract Highlights

`BountyPulse.sol` defines:

### Roles

```text
None
Client
Freelancer
Arbiter
```

### Bounty Status

```text
Open
Locked
Resolved
Disputed
Refunded
```

### Core Functions

- `registerUser()`
- `postBounty()`
- `placeBid()`
- `fundBounty()`
- `submitWork()`
- `approveWork()`
- `disputeBounty()`
- `resolveDispute()`
- `claimFunds()`
- `getBids()`
- `getWithdrawableBalance()`
- `getUser()`
- `getBounty()`
- `getContractBalance()`

### Security / Validation Checks

The contract validates:

- registered users
- client-only operations
- freelancer-only operations
- arbiter-only dispute resolution
- valid bounty IDs
- positive budgets and bids
- bids not exceeding the maximum budget
- selected freelancer matching an existing bid
- sufficient ETH funding
- work submission before approval
- non-empty IPFS CIDs
- non-zero withdrawable balances before claiming

# 💰 Escrow Design

The escrow uses a pull-payment model.

When work is approved:

```text
escrowAmount = selectedBid

platformFee     = escrowAmount × 2%
freelancerAmount = escrowAmount − platformFee
```

The amounts are first recorded in `withdrawableBalance`.

The freelancer then explicitly calls:

```solidity
claimFunds()
```

to receive the ETH.

This prevents the approval transaction from directly pushing the freelancer payment.

# 🌐 Local Network Configuration

```text
Network Name: BountyPulse Local
Chain ID:     31337
RPC URL:      http://127.0.0.1:8545
Contract:     0x5FbDB2315678afecb367f032d93F642f64180aa3
```

# ▶️ Running the Project

## 1. Start Anvil

```bash
anvil
```

Use Chain ID `31337`.

Import one of the Anvil-funded accounts into MetaMask for local testing.

## 2. Build the contracts

```bash
forge build
```

## 3. Run the tests

```bash
forge test
```

The demonstrated checkpoint run completed with:

```text
28 tests passed
0 failed
0 skipped
```

## 4. Deploy BountyPulse

```bash
forge script script/DeployBountyPulse.s.sol:DeployBountyPulse \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

## 5. Start the Pinata server

From the `pinata-server` directory:

```bash
npm install
npm start
```

The server exposes:

```text
http://localhost:3001/
```

and the upload endpoint:

```text
POST /upload
```

Pinata authentication is read from the server-side environment variable:

```text
PINATA_JWT
```

**Do not commit the JWT or any Pinata secret to GitHub.**

## 6. Run the frontend

Open the frontend from:

```text
script/frontend/index.html
```

using a local HTTP server.

Connect MetaMask to:

```text
BountyPulse Local
Chain ID 31337
```

Then follow the bounty workflow shown in the checkpoint evidence.

# 📸 Checkpoint Evidence Summary

| Checkpoint | Requirement | Evidence |
|---|---|---|
| **1** | Local environment | Anvil, MetaMask, Chain ID 31337, funded account, Pinata service |
| **2** | Contract deployment | Forge deployment, gas metrics, contract address, arbiter verification, tests |
| **3** | IPFS pipeline | Pinata upload, CID returned, CID displayed in frontend and used as metadata |
| **4** | Feed & escrow | Bounty creation, bidding, funding, work submission, approval, payment split, claim |
| **5** | Live auto-sync | `WorkApproved` listener + automatic withdrawable balance refresh in frontend |

# 🔐 Security Note

The original checkpoint PDF contains sensitive-looking development credentials, including Pinata API credentials/JWT and local private-key material. These values have **not** been reproduced in this README, and the corresponding evidence screenshots have been redacted.

For a real deployment, use environment variables and rotate any credential that has previously been exposed.

---

## Project Status

**Final DApp implementation completed for the CSE446 Summer 2026 checkpoint workflow.**

**BountyPulse — Decentralized Micro-Bounty & Escrow**
