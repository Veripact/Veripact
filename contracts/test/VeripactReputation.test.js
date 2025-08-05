const { expect } = require("chai");
const { ethers } = require("hardhat");
const { upgrades } = require("hardhat");

describe("VeripactReputation", function () {
    let VeripactReputation;
    let reputationContract;
    let owner;
    let user1;
    let user2;

    // This runs before each test
    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy the logic contract
        VeripactReputation = await ethers.getContractFactory("VeripactReputation");
        // We deploy it as an upgradeable proxy
        reputationContract = await upgrades.deployProxy(VeripactReputation, [owner.address], { initializer: 'initialize' });
        await reputationContract.waitForDeployment();
    });

    it("Should set the right owner", async function () {
        // We check if the owner set in the initializer is correct
        expect(await reputationContract.owner()).to.equal(owner.address);
    });

    it("Should allow the owner to grant a badge", async function () {
        const badgeId = ethers.keccak256(ethers.toUtf8Bytes("HUMAN_VERIFIED"));
        
        // The owner grants a badge to user1
        await reputationContract.connect(owner).grantBadge(user1.address, badgeId);
        
        // We check if user1 now has the badge
        expect(await reputationContract.hasBadge(user1.address, badgeId)).to.be.true;
    });

    it("Should NOT allow a non-owner to grant a badge", async function () {
        const badgeId = ethers.keccak256(ethers.toUtf8Bytes("HUMAN_VERIFIED"));
        
        // We expect this transaction to fail (revert) because user1 is not the owner
        await expect(
            reputationContract.connect(user1).grantBadge(user2.address, badgeId)
        ).to.be.revertedWithCustomError(reputationContract, "OwnableUnauthorizedAccount");
    });
    
    it("Should correctly add a verified off-chain transaction", async function () {
        const nicheId = ethers.keccak256(ethers.toUtf8Bytes("FREELANCE_DESIGN"));
        const txHash = ethers.keccak256(ethers.toUtf8Bytes("unique-tx-id-123"));
        const volume = 1000;

        // The owner adds a verified transaction between user1 (seller) and user2 (buyer)
        await reputationContract.connect(owner).addVerifiedOffchainTransaction(
            user1.address,
            user2.address,
            nicheId,
            volume,
            txHash
        );

        // Check seller's metrics
        const sellerProfile = await reputationContract.getNicheProfile(user1.address, nicheId);
        expect(sellerProfile.asSeller.successfulTxCount).to.equal(1);
        expect(sellerProfile.asSeller.totalVolumeUSDC).to.equal(volume);

        // Check buyer's metrics
        const buyerProfile = await reputationContract.getNicheProfile(user2.address, nicheId);
        expect(buyerProfile.asBuyer.successfulTxCount).to.equal(1);
        expect(buyerProfile.asBuyer.totalVolumeUSDC).to.equal(volume);
    });

    it("Should prevent duplicate transactions from being added", async function () {
        const nicheId = ethers.keccak256(ethers.toUtf8Bytes("FREELANCE_DESIGN"));
        const txHash = ethers.keccak256(ethers.toUtf8Bytes("unique-tx-id-123"));
        const volume = 1000;

        // Add the transaction for the first time
        await reputationContract.connect(owner).addVerifiedOffchainTransaction(
            user1.address,
            user2.address,
            nicheId,
            volume,
            txHash
        );
        
        // We expect the second attempt with the SAME txHash to fail
        await expect(
            reputationContract.connect(owner).addVerifiedOffchainTransaction(
                user1.address,
                user2.address,
                nicheId,
                volume,
                txHash
            )
        ).to.be.revertedWith("Veripact: Transaction already verified.");
    });
});