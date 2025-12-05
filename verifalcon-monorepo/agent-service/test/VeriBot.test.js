const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeriBot Contract", function () {
    let VeriBot;
    let veribot;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        VeriBot = await ethers.getContractFactory("VeriBot");
        [owner, addr1, addr2] = await ethers.getSigners();
        veribot = await VeriBot.deploy();
        await veribot.deployed();
    });

    describe("ERC721 Compliance", function () {
        it("Should mint a new token", async function () {
            await veribot.mint(addr1.address, 1);
            expect(await veribot.ownerOf(1)).to.equal(addr1.address);
        });

        it("Should return the correct token URI", async function () {
            await veribot.mint(addr1.address, 1);
            expect(await veribot.tokenURI(1)).to.equal("https://api.verifalcon.com/tokens/1");
        });
    });

    describe("Reputation Management", function () {
        it("Should update reputation correctly", async function () {
            await veribot.updateReputation(1, true);
            const reputation = await veribot.getReputation(1);
            expect(reputation).to.equal(1); // Assuming success increments reputation
        });

        it("Should not update reputation for non-existent agent", async function () {
            await expect(veribot.updateReputation(999, true)).to.be.revertedWith("Agent does not exist");
        });
    });
});