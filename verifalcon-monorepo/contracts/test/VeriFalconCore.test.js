const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriFalconCore", function () {
    let VeriFalconCore;
    let veriFalconCore;
    let owner;
    let agent;
    let oracle;

    beforeEach(async function () {
        [owner, agent, oracle] = await ethers.getSigners();
        VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
        veriFalconCore = await VeriFalconCore.deploy(80, 5); // minimumAIScore, protocolFee
        await veriFalconCore.deployed();
        
        // Authorize agent and oracle
        await veriFalconCore.connect(owner).authorizeAgent(agent.address);
        await veriFalconCore.connect(owner).authorizeOracle(oracle.address);
    });

    describe("Listing Items", function () {
        it("should allow anyone to list an item", async function () {
            await veriFalconCore.connect(agent).listItem(1, 100);
            const item = await veriFalconCore.listings(1);
            expect(item.seller).to.equal(agent.address);
            expect(item.price.toNumber()).to.equal(100);
            expect(item.isActive).to.be.true;
        });

        it("should revert if price is zero", async function () {
            await expect(veriFalconCore.connect(owner).listItem(1, 0)).to.be.revertedWith("Price must be greater than zero");
        });
    });

    describe("Submitting Results", function () {
        beforeEach(async function () {
            await veriFalconCore.connect(agent).listItem(1, 100);
        });

        it("should allow an oracle to submit results", async function () {
            await veriFalconCore.connect(oracle).submitResults(1, 85);
            const item = await veriFalconCore.listings(1);
            expect(item.aiScore.toNumber()).to.equal(85);
        });

        it("should revert if non-oracle tries to submit results", async function () {
            await expect(veriFalconCore.connect(agent).submitResults(1, 85)).to.be.revertedWith("Not an authorized oracle");
        });
    });

    describe("Purchasing Items", function () {
        beforeEach(async function () {
            await veriFalconCore.connect(agent).listItem(1, 100);
            await veriFalconCore.connect(oracle).submitResults(1, 85);
        });

        it("should allow a user to purchase an item with sufficient funds", async function () {
            await veriFalconCore.connect(owner).purchaseItem(1, { value: 100 });
            const item = await veriFalconCore.listings(1);
            expect(item.isActive).to.be.false;
        });

        it("should revert if insufficient funds sent", async function () {
            await expect(veriFalconCore.connect(owner).purchaseItem(1, { value: 50 })).to.be.revertedWith("Insufficient funds sent");
        });
    });

    describe("Finalizing Transactions", function () {
        beforeEach(async function () {
            await veriFalconCore.connect(agent).listItem(1, 100);
            await veriFalconCore.connect(oracle).submitResults(1, 85);
        });

        it("should allow an authorized agent to finalize a transaction", async function () {
            await veriFalconCore.connect(agent).finalizeTransaction(1);
            const item = await veriFalconCore.listings(1);
            expect(item.isActive).to.be.false;
        });

        it("should revert if non-agent tries to finalize a transaction", async function () {
            await expect(veriFalconCore.connect(owner).finalizeTransaction(1)).to.be.revertedWith("Not an authorized agent");
        });

        it("should revert if AI score is below minimum", async function () {
            await veriFalconCore.connect(agent).listItem(2, 100);
            await veriFalconCore.connect(oracle).submitResults(2, 50);
            await expect(veriFalconCore.connect(agent).finalizeTransaction(2)).to.be.revertedWith("AI score does not meet the minimum requirement");
        });
    });
});