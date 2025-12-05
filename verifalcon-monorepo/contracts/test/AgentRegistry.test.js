const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * AgentRegistry.sol Test Suite
 * Tests ERC-8004 Agent Identity implementation with security features
 */
describe("AgentRegistry", function () {
    let AgentRegistry;
    let agentRegistry;
    let owner;
    let developer;
    let moderator;
    let reporter;
    let user;

    // Content categories enum
    const ContentCategory = {
        Code: 0,
        Image: 1,
        Data: 2,
        Text: 3,
        Audio: 4
    };

    beforeEach(async function () {
        [owner, developer, moderator, reporter, user] = await ethers.getSigners();
        
        AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy();
        await agentRegistry.deployed();

        // Grant moderator role
        const MODERATOR_ROLE = await agentRegistry.MODERATOR_ROLE();
        await agentRegistry.grantRole(MODERATOR_ROLE, moderator.address);
    });

    // ============ REGISTRATION TESTS ============
    describe("Agent Registration", function () {
        it("should register a new agent and mint ERC721 token", async function () {
            const metadataURI = "ipfs://QmTest123";
            const category = ContentCategory.Code;

            const tx = await agentRegistry.connect(developer).registerAgent(metadataURI, category);
            const receipt = await tx.wait();

            // Check token ownership
            expect(await agentRegistry.ownerOf(0)).to.equal(developer.address);

            // Check agent info
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.developer).to.equal(developer.address);
            expect(agentInfo.metadataURI).to.equal(metadataURI);
            expect(agentInfo.category).to.equal(category);
            expect(agentInfo.reputationScore).to.equal(100);
            expect(agentInfo.isActive).to.be.true;
            expect(agentInfo.isFlagged).to.be.false;
        });

        it("should emit AgentRegistered event", async function () {
            await expect(agentRegistry.connect(developer).registerAgent("ipfs://test", ContentCategory.Image))
                .to.emit(agentRegistry, "AgentRegistered");
        });

        it("should increment agent counter correctly", async function () {
            await agentRegistry.connect(developer).registerAgent("uri1", ContentCategory.Code);
            await agentRegistry.connect(developer).registerAgent("uri2", ContentCategory.Text);
            await agentRegistry.connect(developer).registerAgent("uri3", ContentCategory.Audio);

            expect(await agentRegistry.getTotalAgents()).to.equal(3);
        });

        it("should support all content categories", async function () {
            for (const [name, value] of Object.entries(ContentCategory)) {
                await agentRegistry.connect(developer).registerAgent(`uri-${name}`, value);
                const agentInfo = await agentRegistry.getAgentInfo(value);
                expect(agentInfo.category).to.equal(value);
            }
        });
    });

    // ============ MODERATION TESTS ============
    describe("Community Reporting", function () {
        beforeEach(async function () {
            await agentRegistry.connect(developer).registerAgent("ipfs://agent", ContentCategory.Code);
        });

        it("should allow anyone to report an agent", async function () {
            await agentRegistry.connect(reporter).reportAgent(0);
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.reportCount).to.equal(1);
        });

        it("should not allow reporting own agent", async function () {
            await expect(agentRegistry.connect(developer).reportAgent(0))
                .to.be.revertedWith("Cannot report own agent");
        });

        it("should auto-flag after reaching threshold", async function () {
            // Default threshold is 5
            const signers = await ethers.getSigners();
            for (let i = 2; i < 7; i++) {
                await agentRegistry.connect(signers[i]).reportAgent(0);
            }

            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.isFlagged).to.be.true;
            expect(agentInfo.isActive).to.be.false;
        });

        it("should emit AgentReported event", async function () {
            await expect(agentRegistry.connect(reporter).reportAgent(0))
                .to.emit(agentRegistry, "AgentReported")
                .withArgs(0, reporter.address, 1);
        });
    });

    describe("Moderator Flagging", function () {
        beforeEach(async function () {
            await agentRegistry.connect(developer).registerAgent("ipfs://agent", ContentCategory.Code);
        });

        it("should allow moderator to flag an agent", async function () {
            await agentRegistry.connect(moderator).flagAgent(0, "Malicious behavior");
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.isFlagged).to.be.true;
            expect(agentInfo.isActive).to.be.false;
        });

        it("should not allow non-moderator to flag", async function () {
            await expect(agentRegistry.connect(user).flagAgent(0, "reason"))
                .to.be.reverted; // AccessControl revert
        });

        it("should allow moderator to unflag an agent", async function () {
            await agentRegistry.connect(moderator).flagAgent(0, "test");
            await agentRegistry.connect(moderator).unflagAgent(0);
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.isFlagged).to.be.false;
            expect(agentInfo.reportCount).to.equal(0); // Reset after unflag
        });
    });

    // ============ EMERGENCY STOP TESTS ============
    describe("Emergency Stop (Pause)", function () {
        it("should pause and unpause registration", async function () {
            await agentRegistry.connect(owner).pause();
            
            await expect(agentRegistry.connect(developer).registerAgent("test", ContentCategory.Code))
                .to.be.reverted; // Pausable revert

            await agentRegistry.connect(owner).unpause();
            await agentRegistry.connect(developer).registerAgent("test", ContentCategory.Code);
            expect(await agentRegistry.getTotalAgents()).to.equal(1);
        });

        it("should only allow admin to pause", async function () {
            await expect(agentRegistry.connect(user).pause())
                .to.be.reverted; // AccessControl revert
        });
    });

    // ============ REPUTATION TESTS ============
    describe("Reputation System", function () {
        beforeEach(async function () {
            await agentRegistry.connect(developer).registerAgent("ipfs://agent", ContentCategory.Code);
        });

        it("should increase reputation on success", async function () {
            await agentRegistry.connect(owner).updateReputation(0, true);
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.reputationScore).to.equal(110);
            expect(agentInfo.successfulTasks).to.equal(1);
            expect(agentInfo.totalTasks).to.equal(1);
        });

        it("should decrease reputation on failure", async function () {
            await agentRegistry.connect(owner).updateReputation(0, false);
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.reputationScore).to.equal(95);
            expect(agentInfo.successfulTasks).to.equal(0);
            expect(agentInfo.totalTasks).to.equal(1);
        });

        it("should auto-deactivate when reputation drops below minimum", async function () {
            // Start at 100, need to drop below 50
            // Each failure = -5, so need 11 failures to go from 100 to 45
            for (let i = 0; i < 11; i++) {
                await agentRegistry.connect(owner).updateReputation(0, false);
            }
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.reputationScore).to.equal(45);
            expect(agentInfo.isActive).to.be.false;
        });

        it("should not underflow reputation below 0", async function () {
            // Reduce reputation many times
            for (let i = 0; i < 25; i++) {
                await agentRegistry.connect(owner).updateReputation(0, false);
            }
            
            const agentInfo = await agentRegistry.getAgentInfo(0);
            expect(agentInfo.reputationScore).to.equal(0);
        });
    });

    // ============ VIEW FUNCTIONS ============
    describe("View Functions", function () {
        it("should return agent availability correctly", async function () {
            await agentRegistry.connect(developer).registerAgent("test", ContentCategory.Code);
            
            expect(await agentRegistry.isAgentAvailable(0)).to.be.true;
            
            // Flag agent
            await agentRegistry.connect(moderator).flagAgent(0, "test");
            expect(await agentRegistry.isAgentAvailable(0)).to.be.false;
        });

        it("should return false for non-existent agent", async function () {
            expect(await agentRegistry.isAgentAvailable(999)).to.be.false;
        });
    });

    // Helper function
    async function getBlockTimestamp() {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        return block.timestamp;
    }
});
