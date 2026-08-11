
let provider;
let signer;
let contract;
let eventContract = null;

const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const EXPECTED_CHAIN_ID = 31337n;

let contractAbi = null;
let workFileCid = "";

// ============================================================
// CHECKPOINT 5 - LIVE EVENT AUTO-SYNC
// ============================================================

let eventListenersActive = false;
let balanceRefreshInterval = null;

let lastKnownWithdrawableBalance = null;

// ============================================================
// CONNECT WALLET
// ============================================================

async function connectWallet() {
    try {
        console.log("Connect button clicked");

        if (!window.ethereum) {
            alert("MetaMask is not installed.");
            return;
        }

        provider = new ethers.BrowserProvider(window.ethereum);

        await provider.send("eth_requestAccounts", []);

        signer = await provider.getSigner();

        const address = await signer.getAddress();

        const network = await provider.getNetwork();

        console.log("Connected wallet:", address);
        console.log(
            "Network chain ID:",
            network.chainId.toString()
        );

        if (network.chainId !== EXPECTED_CHAIN_ID) {
            alert(
                "Please switch MetaMask to BountyPulse Local " +
                "(Chain ID 31337)."
            );
            return;
        }

        await loadContract();

        updateWalletUI(address);

        console.log(
            "Contract connected:",
            contract
        );

        // Check current balance immediately
        await refreshWithdrawableBalance();

        // Start Checkpoint 5 live synchronization
        setupLiveEventSync();

        alert("Wallet connected successfully!");

    } catch (error) {
        console.error(
            "Connection error:",
            error
        );

        alert(
            "Connection failed: " +
            getErrorMessage(error)
        );
    }
}


// ============================================================
// LOAD CONTRACT
// ============================================================

async function loadContract() {
    if (!provider) {
        throw new Error("Provider is not initialized.");
    }

    const response =
        await fetch("BountyPulse.json");

    if (!response.ok) {
        throw new Error(
            "Could not load BountyPulse.json"
        );
    }

    const json =
        await response.json();

    contractAbi =
        json.abi || json;

    if (!Array.isArray(contractAbi)) {
        throw new Error(
            "Invalid BountyPulse ABI."
        );
    }

    contract =
        new ethers.Contract(
            CONTRACT_ADDRESS,
            contractAbi,
            signer
        );

    console.log(
        "Contract loaded:",
        CONTRACT_ADDRESS
    );
}


// ============================================================
// UPDATE WALLET UI
// ============================================================

function updateWalletUI(address) {
    const walletAddress =
        document.getElementById(
            "walletAddress"
        );

    const networkStatus =
        document.getElementById(
            "networkStatus"
        );

    if (walletAddress) {
        walletAddress.textContent =
            address;
    }

    if (networkStatus) {
        networkStatus.textContent =
            "Network: BountyPulse Local (Chain ID 31337)";
    }
}


// ============================================================
// IPFS - BOUNTY DETAILS
// ============================================================

async function handleIPFSUpload() {
    try {
        const fileInput =
            document.getElementById(
                "fileInput"
            );

        const uploadStatus =
            document.getElementById(
                "uploadStatus"
            );

        const ipfsCid =
            document.getElementById(
                "ipfsCid"
            );

        const bountyDetailsCid =
            document.getElementById(
                "bountyDetailsCid"
            );

        const file =
            fileInput.files[0];

        if (!file) {
            alert(
                "Please select a file first."
            );
            return;
        }

        uploadStatus.textContent =
            "Uploading to IPFS...";

        ipfsCid.textContent = "-";

        console.log(
            "Uploading file:",
            file.name
        );

        const result =
            await uploadToIPFS(file);

        console.log(
            "IPFS upload result:",
            result
        );

        if (!result || !result.cid) {
            throw new Error(
                "No CID returned from IPFS."
            );
        }

        ipfsCid.textContent =
            result.cid;

        bountyDetailsCid.value =
            result.cid;

        uploadStatus.textContent =
            "Upload successful! CID received from Pinata.";

        console.log(
            "IPFS CID:",
            result.cid
        );

    } catch (error) {
        console.error(
            "IPFS upload error:",
            error
        );

        const status =
            document.getElementById(
                "uploadStatus"
            );

        if (status) {
            status.textContent =
                "Upload failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// POST BOUNTY
// ============================================================

async function handlePostBounty() {
    try {
        console.log(
            "Post bounty button clicked"
        );

        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const amountElement =
            document.getElementById(
                "bountyAmount"
            );

        const cidElement =
            document.getElementById(
                "bountyDetailsCid"
            );

        const statusElement =
            document.getElementById(
                "bountyStatus"
            );

        if (
            !amountElement ||
            !cidElement ||
            !statusElement
        ) {
            throw new Error(
                "Bounty form elements were not found."
            );
        }

        const amount =
            amountElement.value.trim();

        const cid =
            cidElement.value.trim();

        if (!amount) {
            alert(
                "Please enter a bounty amount."
            );
            return;
        }

        if (Number(amount) <= 0) {
            alert(
                "Bounty amount must be greater than 0."
            );
            return;
        }

        if (!cid) {
            alert(
                "Please upload bounty details to IPFS first."
            );
            return;
        }

        statusElement.textContent =
            "Posting bounty...";

        const reward =
            ethers.parseEther(amount);

        const tx =
            await contract.postBounty(
                reward,
                cid
            );

        console.log(
            "Transaction sent:",
            tx.hash
        );

        statusElement.textContent =
            "Waiting for blockchain confirmation...";

        await tx.wait();

        console.log(
            "Transaction confirmed:",
            tx.hash
        );

        statusElement.textContent =
            "Bounty posted successfully!";

        alert(
            "Bounty posted successfully!"
        );

        if (
            typeof contract.bountyCounter ===
            "function"
        ) {
            const counter =
                await contract.bountyCounter();

            console.log(
                "Current bounty counter:",
                counter.toString()
            );
        }

    } catch (error) {
        console.error(
            "Post bounty error:",
            error
        );

        const statusElement =
            document.getElementById(
                "bountyStatus"
            );

        if (statusElement) {
            statusElement.textContent =
                "Failed: " +
                getErrorMessage(error);
        }

        alert(
            "Post bounty failed: " +
            getErrorMessage(error)
        );
    }
}


// ============================================================
// GET / VIEW BOUNTY
// ============================================================

async function handleGetBounty() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const input =
            document.getElementById(
                "viewBountyId"
            );

        if (!input) {
            throw new Error(
                "Bounty ID input was not found."
            );
        }

        const bountyId =
            input.value.trim();

        if (!bountyId) {
            alert(
                "Please enter a bounty ID."
            );
            return;
        }

        console.log(
            "Getting bounty:",
            bountyId
        );

        const bounty =
            await contract.getBounty(
                bountyId
            );

        console.log(
            "Bounty:",
            bounty
        );

        const displayId =
            document.getElementById(
                "displayBountyId"
            );

        const displayCreator =
            document.getElementById(
                "displayCreator"
            );

        const displayReward =
            document.getElementById(
                "displayReward"
            );

        const displayDetailsCid =
            document.getElementById(
                "displayDetailsCid"
            );

        const displayStatus =
            document.getElementById(
                "displayStatus"
            );

        const displayFreelancer =
            document.getElementById(
                "displayFreelancer"
            );

        const displayFundedAmount =
            document.getElementById(
                "displayFundedAmount"
            );

        const displayWorkCid =
            document.getElementById(
                "displayWorkCid"
            );

        if (displayId) {
            displayId.textContent =
                bounty[0].toString();
        }

        if (displayCreator) {
            displayCreator.textContent =
                bounty[1];
        }

        if (displayReward) {
            displayReward.textContent =
                ethers.formatEther(
                    bounty[2]
                ) + " ETH";
        }

        if (displayDetailsCid) {
            displayDetailsCid.textContent =
                bounty[3];
        }

        if (displayStatus) {
            displayStatus.textContent =
                getStatusName(
                    bounty[4]
                );
        }

        if (displayFreelancer) {
            displayFreelancer.textContent =
                bounty[5];
        }

        if (displayFundedAmount) {
            displayFundedAmount.textContent =
                ethers.formatEther(
                    bounty[6]
                ) + " ETH";
        }

        if (displayWorkCid) {
            displayWorkCid.textContent =
                bounty[7] || "-";
        }

    } catch (error) {
        console.error(
            "Get bounty error:",
            error
        );

        alert(
            "Could not load bounty: " +
            getErrorMessage(error)
        );
    }
}


// ============================================================
// PLACE BID
// ============================================================

async function handlePlaceBid() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const bountyId =
            document.getElementById(
                "bidBountyId"
            ).value.trim();

        const amount =
            document.getElementById(
                "bidAmount"
            ).value.trim();

        const status =
            document.getElementById(
                "bidStatus"
            );

        if (!bountyId || !amount) {
            alert(
                "Please enter bounty ID and bid amount."
            );
            return;
        }

        if (Number(amount) <= 0) {
            alert(
                "Bid amount must be greater than 0."
            );
            return;
        }

        status.textContent =
            "Placing bid...";

        const bidAmount =
            ethers.parseEther(amount);

        const tx =
            await contract.placeBid(
                bountyId,
                bidAmount
            );

        console.log(
            "Bid transaction:",
            tx.hash
        );

        status.textContent =
            "Waiting for confirmation...";

        await tx.wait();

        status.textContent =
            "Bid placed successfully!";

        alert(
            "Bid placed successfully!"
        );

    } catch (error) {
        console.error(
            "Place bid error:",
            error
        );

        const status =
            document.getElementById(
                "bidStatus"
            );

        if (status) {
            status.textContent =
                "Failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// FUND BOUNTY
// ============================================================

async function handleFundBounty() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const bountyId =
            document.getElementById(
                "fundBountyId"
            ).value.trim();

        const freelancer =
            document.getElementById(
                "fundFreelancer"
            ).value.trim();

        const amount =
            document.getElementById(
                "fundAmount"
            ).value.trim();

        const status =
            document.getElementById(
                "fundStatus"
            );

        if (
            !bountyId ||
            !freelancer ||
            !amount
        ) {
            alert(
                "Please fill in all funding fields."
            );
            return;
        }

        if (!ethers.isAddress(freelancer)) {
            alert(
                "Please enter a valid freelancer address."
            );
            return;
        }

        if (Number(amount) <= 0) {
            alert(
                "Funding amount must be greater than 0."
            );
            return;
        }

        status.textContent =
            "Funding bounty...";

        const value =
            ethers.parseEther(amount);

        const tx =
            await contract.fundBounty(
                bountyId,
                freelancer,
                value,
                {
                    value: value
                }
            );

        console.log(
            "Funding transaction:",
            tx.hash
        );

        status.textContent =
            "Waiting for confirmation...";

        await tx.wait();

        status.textContent =
            "Bounty funded successfully!";

        alert(
            "Bounty funded successfully!"
        );

    } catch (error) {
        console.error(
            "Fund bounty error:",
            error
        );

        const status =
            document.getElementById(
                "fundStatus"
            );

        if (status) {
            status.textContent =
                "Failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// WORK - IPFS UPLOAD
// ============================================================

async function handleWorkUpload() {
    try {
        const fileInput =
            document.getElementById(
                "workFileInput"
            );

        const status =
            document.getElementById(
                "workUploadStatus"
            );

        const workCid =
            document.getElementById(
                "workCid"
            );

        const file =
            fileInput.files[0];

        if (!file) {
            alert(
                "Please select the completed work."
            );
            return;
        }

        status.textContent =
            "Uploading work to IPFS...";

        workCid.textContent = "-";

        console.log(
            "Uploading work file:",
            file.name
        );

        const result =
            await uploadToIPFS(file);

        console.log(
            "Work upload result:",
            result
        );

        if (!result || !result.cid) {
            throw new Error(
                "No CID returned from IPFS."
            );
        }

        workFileCid =
            result.cid;

        workCid.textContent =
            workFileCid;

        status.textContent =
            "Work uploaded successfully!";

        console.log(
            "Work CID:",
            workFileCid
        );

        const submitButton =
            document.getElementById(
                "submitWork"
            );

        if (submitButton) {
            submitButton.disabled =
                false;
        }

    } catch (error) {
        console.error(
            "Work upload error:",
            error
        );

        const status =
            document.getElementById(
                "workUploadStatus"
            );

        if (status) {
            status.textContent =
                "Upload failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// SUBMIT WORK
// ============================================================

async function handleSubmitWork() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const bountyId =
            document.getElementById(
                "workBountyId"
            ).value.trim();

        const status =
            document.getElementById(
                "submitWorkStatus"
            );

        if (!bountyId) {
            alert(
                "Please enter a bounty ID."
            );
            return;
        }

        if (!workFileCid) {
            alert(
                "Please upload your work to IPFS first."
            );
            return;
        }

        status.textContent =
            "Submitting work to blockchain...";

        const tx =
            await contract.submitWork(
                bountyId,
                workFileCid
            );

        console.log(
            "Submit work transaction:",
            tx.hash
        );

        status.textContent =
            "Waiting for confirmation...";

        await tx.wait();

        status.textContent =
            "Work submitted successfully!";

        alert(
            "Work submitted successfully!"
        );

    } catch (error) {
        console.error(
            "Submit work error:",
            error
        );

        const status =
            document.getElementById(
                "submitWorkStatus"
            );

        if (status) {
            status.textContent =
                "Failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// APPROVE WORK
// ============================================================

async function handleApproveWork() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const bountyId =
            document.getElementById(
                "approveBountyId"
            ).value.trim();

        const status =
            document.getElementById(
                "approveStatus"
            );

        if (!bountyId) {
            alert(
                "Please enter a bounty ID."
            );
            return;
        }

        status.textContent =
            "Approving work...";

        const tx =
            await contract.approveWork(
                bountyId
            );

        console.log(
            "Approve transaction:",
            tx.hash
        );

        status.textContent =
            "Waiting for confirmation...";

        await tx.wait();

        status.textContent =
            "Work approved successfully!";

        alert(
            "Work approved successfully!"
        );

        // Refresh the current wallet balance too.
        await refreshWithdrawableBalance();

    } catch (error) {
        console.error(
            "Approve work error:",
            error
        );

        const status =
            document.getElementById(
                "approveStatus"
            );

        if (status) {
            status.textContent =
                "Failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// CLAIM FUNDS
// ============================================================

async function handleClaimFunds() {
    try {
        if (!contract) {
            alert(
                "Please connect MetaMask first."
            );
            return;
        }

        const status =
            document.getElementById(
                "claimStatus"
            );

        status.textContent =
            "Claiming funds...";

        const tx =
            await contract.claimFunds();

        console.log(
            "Claim transaction:",
            tx.hash
        );

        status.textContent =
            "Waiting for confirmation...";

        await tx.wait();

        status.textContent =
            "Funds claimed successfully!";

        alert(
            "Funds claimed successfully!"
        );

        await refreshWithdrawableBalance();

    } catch (error) {
        console.error(
            "Claim funds error:",
            error
        );

        const status =
            document.getElementById(
                "claimStatus"
            );

        if (status) {
            status.textContent =
                "Failed: " +
                getErrorMessage(error);
        }
    }
}


// ============================================================
// CHECK WITHDRAWABLE BALANCE
// ============================================================

async function handleCheckBalance() {
    await refreshWithdrawableBalance(
        true
    );
}


// ============================================================
// CHECKPOINT 5
// REFRESH UNCLAIMED EARNINGS
// ============================================================

async function refreshWithdrawableBalance(
    showAlert = false
) {
    try {
        if (!contract || !signer) {
            return;
        }

        const address =
            await signer.getAddress();

        const balance =
            await contract.getWithdrawableBalance(
                address
            );

        const formatted =
            ethers.formatEther(
                balance
            );

        lastKnownWithdrawableBalance =
            balance;

        // Main balance element
        const balanceElement =
            document.getElementById(
                "withdrawableBalance"
            );

        if (balanceElement) {
            balanceElement.textContent =
                formatted;
        }

        // Optional alternative IDs.
        // These make the live-sync feature work
        // even if the HTML uses one of these names.
        const earningsElement =
            document.getElementById(
                "unclaimedEarnings"
            );

        if (earningsElement) {
            earningsElement.textContent =
                formatted + " ETH";
        }

        const liveEarningsElement =
            document.getElementById(
                "liveUnclaimedEarnings"
            );

        if (liveEarningsElement) {
            liveEarningsElement.textContent =
                formatted + " ETH";
        }

        console.log(
            "Unclaimed Earnings:",
            formatted,
            "ETH"
        );

        if (showAlert) {
            alert(
                "Withdrawable balance: " +
                formatted +
                " ETH"
            );
        }

        return balance;

    } catch (error) {
        console.error(
            "Balance refresh error:",
            error
        );

        if (showAlert) {
            alert(
                "Could not check balance: " +
                getErrorMessage(error)
            );
        }
    }
}


// ============================================================
// CHECKPOINT 5
// LIVE BLOCKCHAIN EVENT LISTENERS
// ============================================================

function setupLiveEventSync() {
    try {
        if (!provider || !contractAbi) {
            console.log(
                "Cannot setup live sync yet."
            );
            return;
        }

        // Remove previous listeners first.
        removeLiveEventSync();

        // IMPORTANT:
        // Use a provider-connected contract for event listening.
        eventContract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                contractAbi,
                provider
            );

        // ----------------------------------------------------
        // WORK APPROVED EVENT
        // ----------------------------------------------------
        //
        // Solidity event:
        //
        // event WorkApproved(
        //     uint256 indexed bountyId,
        //     address indexed freelancer,
        //     uint256 freelancerAmount,
        //     uint256 platformFee
        // );
        //
        // When Client approves work in Window 1,
        // this listener runs in Window 2.
        // ----------------------------------------------------

        eventContract.on(
            "WorkApproved",
            async function (
                bountyId,
                freelancer,
                freelancerAmount,
                platformFee
            ) {
                try {
                    console.log(
                        "================================"
                    );

                    console.log(
                        "LIVE EVENT: WorkApproved"
                    );

                    console.log(
                        "Bounty ID:",
                        bountyId.toString()
                    );

                    console.log(
                        "Freelancer:",
                        freelancer
                    );

                    console.log(
                        "Freelancer amount:",
                        ethers.formatEther(
                            freelancerAmount
                        ),
                        "ETH"
                    );

                    console.log(
                        "Platform fee:",
                        ethers.formatEther(
                            platformFee
                        ),
                        "ETH"
                    );

                    console.log(
                        "================================"
                    );

                    if (!signer) {
                        return;
                    }

                    const currentAddress =
                        await signer.getAddress();

                    // Only update the balance if this
                    // browser is the selected freelancer.
                    if (
                        freelancer.toLowerCase() ===
                        currentAddress.toLowerCase()
                    ) {
                        console.log(
                            "This wallet is the freelancer."
                        );

                        await refreshWithdrawableBalance();

                        showLiveSyncMessage(
                            "Work approved! " +
                            "Unclaimed Earnings updated automatically."
                        );
                    } else {
                        console.log(
                            "WorkApproved belongs to another freelancer."
                        );
                    }

                } catch (error) {
                    console.error(
                        "WorkApproved event handling error:",
                        error
                    );
                }
            }
        );


        // ----------------------------------------------------
        // FUNDS CLAIMED EVENT
        // ----------------------------------------------------

        eventContract.on(
            "FundsClaimed",
            async function (
                user,
                amount
            ) {
                try {
                    console.log(
                        "LIVE EVENT: FundsClaimed"
                    );

                    console.log(
                        "User:",
                        user
                    );

                    console.log(
                        "Amount:",
                        ethers.formatEther(
                            amount
                        ),
                        "ETH"
                    );

                    if (!signer) {
                        return;
                    }

                    const currentAddress =
                        await signer.getAddress();

                    if (
                        user.toLowerCase() ===
                        currentAddress.toLowerCase()
                    ) {
                        await refreshWithdrawableBalance();

                        showLiveSyncMessage(
                            "Funds claimed. " +
                            "Unclaimed Earnings updated."
                        );
                    }

                } catch (error) {
                    console.error(
                        "FundsClaimed event error:",
                        error
                    );
                }
            }
        );

        eventListenersActive =
            true;

        console.log(
            "Checkpoint 5 live event sync ACTIVE."
        );

        // ----------------------------------------------------
        // FALLBACK POLLING
        // ----------------------------------------------------
        //
        // The event listener is the main mechanism.
        // This polling is only a safety net.
        // It does NOT require page reload.
        // ----------------------------------------------------

        startBalanceFallbackPolling();

    } catch (error) {
        console.error(
            "Could not setup live event sync:",
            error
        );
    }
}


// ============================================================
// REMOVE LIVE EVENT LISTENERS
// ============================================================

function removeLiveEventSync() {
    try {
        if (eventContract) {
            eventContract.removeAllListeners(
                "WorkApproved"
            );

            eventContract.removeAllListeners(
                "FundsClaimed"
            );
        }

        eventListenersActive =
            false;

        stopBalanceFallbackPolling();

    } catch (error) {
        console.error(
            "Error removing event listeners:",
            error
        );
    }
}


// ============================================================
// CHECKPOINT 5
// FALLBACK BALANCE POLLING
// ============================================================

function startBalanceFallbackPolling() {
    stopBalanceFallbackPolling();

    balanceRefreshInterval =
        setInterval(
            async function () {
                try {
                    if (
                        !contract ||
                        !signer
                    ) {
                        return;
                    }

                    await refreshWithdrawableBalance();

                } catch (error) {
                    console.error(
                        "Background balance refresh error:",
                        error
                    );
                }
            },
            2000
        );
}


function stopBalanceFallbackPolling() {
    if (
        balanceRefreshInterval !== null
    ) {
        clearInterval(
            balanceRefreshInterval
        );

        balanceRefreshInterval =
            null;
    }
}


// ============================================================
// LIVE SYNC MESSAGE
// ============================================================

function showLiveSyncMessage(message) {
    console.log(
        "CHECKPOINT 5:",
        message
    );

    const liveStatus =
        document.getElementById(
            "liveSyncStatus"
        );

    if (liveStatus) {
        liveStatus.textContent =
            message;

        liveStatus.style.display =
            "block";

        setTimeout(
            function () {
                liveStatus.style.display =
                    "none";
            },
            5000
        );
    }

    // Optional browser notification through
    // the existing status area if available.
    const claimStatus =
        document.getElementById(
            "claimStatus"
        );

    if (
        claimStatus &&
        message.includes("Unclaimed Earnings")
    ) {
        claimStatus.textContent =
            message;
    }
}


// ============================================================
// STATUS NAME
// ============================================================

function getStatusName(status) {
    const statusNumber =
        Number(status);

    const statuses = [
        "Open",
        "Funded",
        "Submitted",
        "Approved",
        "Disputed",
        "Completed"
    ];

    if (
        statusNumber >= 0 &&
        statusNumber < statuses.length
    ) {
        return statuses[
            statusNumber
        ];
    }

    return (
        "Unknown (" +
        statusNumber +
        ")"
    );
}


// ============================================================
// ERROR HANDLER
// ============================================================

function getErrorMessage(error) {
    if (!error) {
        return "Unknown error";
    }

    if (error.reason) {
        return error.reason;
    }

    if (
        error.info &&
        error.info.error &&
        error.info.error.message
    ) {
        return (
            error.info.error.message
        );
    }

    if (
        error.data &&
        typeof error.data === "string"
    ) {
        return error.data;
    }

    if (error.message) {
        return error.message;
    }

    return "Unknown error";
}


// ============================================================
// BUTTON EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    const connectButton =
        document.getElementById(
            "connectWallet"
        );

    const uploadButton =
        document.getElementById(
            "uploadFile"
        );

    const postBountyButton =
        document.getElementById(
            "postBounty"
        );

    const getBountyButton =
        document.getElementById(
            "getBounty"
        );

    const placeBidButton =
        document.getElementById(
            "placeBid"
        );

    const fundBountyButton =
        document.getElementById(
            "fundBounty"
        );

    const uploadWorkButton =
        document.getElementById(
            "uploadWork"
        );

    const submitWorkButton =
        document.getElementById(
            "submitWork"
        );

    const approveWorkButton =
        document.getElementById(
            "approveWork"
        );

    const claimFundsButton =
        document.getElementById(
            "claimFunds"
        );

    const checkBalanceButton =
        document.getElementById(
            "checkBalance"
        );


    // Connect Wallet
    if (connectButton) {
        connectButton.addEventListener(
            "click",
            connectWallet
        );
    }


    // Bounty IPFS Upload
    if (uploadButton) {
        uploadButton.addEventListener(
            "click",
            handleIPFSUpload
        );
    }


    // Post Bounty
    if (postBountyButton) {
        postBountyButton.addEventListener(
            "click",
            handlePostBounty
        );
    }


    // View Bounty
    if (getBountyButton) {
        getBountyButton.addEventListener(
            "click",
            handleGetBounty
        );
    }


    // Place Bid
    if (placeBidButton) {
        placeBidButton.addEventListener(
            "click",
            handlePlaceBid
        );
    }


    // Fund Bounty
    if (fundBountyButton) {
        fundBountyButton.addEventListener(
            "click",
            handleFundBounty
        );
    }


    // Work Upload
    if (uploadWorkButton) {
        uploadWorkButton.addEventListener(
            "click",
            handleWorkUpload
        );
    }


    // Submit Work
    if (submitWorkButton) {
        submitWorkButton.addEventListener(
            "click",
            handleSubmitWork
        );

        submitWorkButton.disabled =
            true;
    }


    // Approve Work
    if (approveWorkButton) {
        approveWorkButton.addEventListener(
            "click",
            handleApproveWork
        );
    }


    // Claim Funds
    if (claimFundsButton) {
        claimFundsButton.addEventListener(
            "click",
            handleClaimFunds
        );
    }


    // Check Balance
    if (checkBalanceButton) {
        checkBalanceButton.addEventListener(
            "click",
            handleCheckBalance
        );
    }
}


// ============================================================
// METAMASK EVENTS
// ============================================================

function setupMetaMaskEvents() {
    if (!window.ethereum) {
        return;
    }


    // --------------------------------------------------------
    // ACCOUNT CHANGED
    // --------------------------------------------------------

    window.ethereum.on(
        "accountsChanged",
        async function (accounts) {
            try {
                console.log(
                    "MetaMask accounts changed:",
                    accounts
                );

                if (
                    !accounts ||
                    accounts.length === 0
                ) {
                    removeLiveEventSync();

                    provider = null;
                    signer = null;
                    contract = null;

                    const walletAddress =
                        document.getElementById(
                            "walletAddress"
                        );

                    const networkStatus =
                        document.getElementById(
                            "networkStatus"
                        );

                    if (walletAddress) {
                        walletAddress.textContent =
                            "Wallet not connected";
                    }

                    if (networkStatus) {
                        networkStatus.textContent =
                            "Network: Not connected";
                    }

                    return;
                }


                if (!provider) {
                    provider =
                        new ethers.BrowserProvider(
                            window.ethereum
                        );
                }


                signer =
                    await provider.getSigner();


                const address =
                    await signer.getAddress();


                const network =
                    await provider.getNetwork();


                if (
                    network.chainId !==
                    EXPECTED_CHAIN_ID
                ) {
                    alert(
                        "Please switch MetaMask to " +
                        "BountyPulse Local " +
                        "(Chain ID 31337)."
                    );

                    return;
                }


                if (!contractAbi) {
                    const response =
                        await fetch(
                            "BountyPulse.json"
                        );

                    if (!response.ok) {
                        throw new Error(
                            "Could not load BountyPulse.json"
                        );
                    }

                    const json =
                        await response.json();

                    contractAbi =
                        json.abi || json;
                }


                contract =
                    new ethers.Contract(
                        CONTRACT_ADDRESS,
                        contractAbi,
                        signer
                    );


                updateWalletUI(
                    address
                );


                // IMPORTANT:
                // Reconnect live listeners to the
                // newly selected MetaMask account.
                setupLiveEventSync();


                // Immediately load the new
                // account's earnings.
                await refreshWithdrawableBalance();


                console.log(
                    "Account changed:",
                    address
                );

            } catch (error) {
                console.error(
                    "Account change error:",
                    error
                );
            }
        }
    );


    // --------------------------------------------------------
    // NETWORK / CHAIN CHANGED
    // --------------------------------------------------------

    window.ethereum.on(
        "chainChanged",
        function () {
            removeLiveEventSync();

            window.location.reload();
        }
    );
}


// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        setupEventListeners();
        setupMetaMaskEvents();

        console.log(
            "BountyPulse DApp initialized."
        );

        console.log(
            "Checkpoint 5 live event sync ready."
        );
    }
);
