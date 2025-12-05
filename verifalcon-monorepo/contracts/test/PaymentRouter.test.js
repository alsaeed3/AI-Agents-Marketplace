const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * PaymentRouter.sol Test Suite
 * Tests x402 Micro-payments implementation with security features
 */
describe("PaymentRouter", function () {
    let PaymentRouter;
    let paymentRouter;
    let AgentRegistry;
    let agentRegistry;
    let owner;
    let client;
    let developer;
    let operator;

    const TERMS_VERSION = "v1.0.0";
    const ONE_HOUR = 60 * 60;
    const ONE_DAY = 24 * ONE_HOUR;
    const TIMELOCK_DURATION = 48 * ONE_HOUR;

    // Task status enum
    const TaskStatus = {
        Pending: 0,
        InProgress: 1,
        Completed: 2,
        Refunded: 3,
        Disputed: 4
    };

    beforeEach(async function () {
        [owner, client, developer, operator] = await ethers.getSigners();

        // Deploy AgentRegistry first
        AgentRegistry = await ethers.getContractFactory("AgentRegistry");
        agentRegistry = await AgentRegistry.deploy();
        await agentRegistry.deployed();

        // Deploy PaymentRouter
        PaymentRouter = await ethers.getContractFactory("PaymentRouter");
        paymentRouter = await PaymentRouter.deploy(TERMS_VERSION);
        await paymentRouter.deployed();

        // Link contracts
        await paymentRouter.setAgentRegistry(agentRegistry.address);

        // Grant operator role
        const OPERATOR_ROLE = await paymentRouter.OPERATOR_ROLE();
        await paymentRouter.grantRole(OPERATOR_ROLE, operator.address);

        // Register an agent
        await agentRegistry.connect(developer).registerAgent("ipfs://agent", 0);
    });

    // ============ TERMS OF SERVICE TESTS ============
    describe("Terms of Service", function () {
        it("should require terms acceptance before creating task", async function () {
            const deadline = await getDeadline(ONE_HOUR);
            
            await expect(
                paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                    value: ethers.utils.parseEther("0.1")
                })
            ).to.be.revertedWith("Must accept current Terms of Service");
        });

        it("should allow accepting terms", async function () {
            await paymentRouter.connect(client).acceptTerms();
            expect(await paymentRouter.hasAcceptedTerms(client.address)).to.be.true;
        });

        it("should emit TermsAccepted event", async function () {
            await expect(paymentRouter.connect(client).acceptTerms())
                .to.emit(paymentRouter, "TermsAccepted");
        });

        it("should not allow accepting terms twice", async function () {
            await paymentRouter.connect(client).acceptTerms();
            await expect(paymentRouter.connect(client).acceptTerms())
                .to.be.revertedWith("Already accepted current terms");
        });

        it("should require re-acceptance after version update", async function () {
            await paymentRouter.connect(client).acceptTerms();
            await paymentRouter.connect(owner).updateTermsVersion("v2.0.0");
            
            expect(await paymentRouter.hasAcceptedTerms(client.address)).to.be.false;
        });
    });

    // ============ TASK CREATION TESTS ============
    describe("Task Creation", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
        });

        it("should create a task with payment in escrow", async function () {
            const payment = ethers.utils.parseEther("1.0");
            const deadline = await getDeadline(ONE_HOUR);

            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: payment
            });

            const task = await paymentRouter.getTask(0);
            expect(task.agentId).to.equal(0);
            expect(task.client).to.equal(client.address);
            expect(task.developer).to.equal(developer.address);
            expect(task.payment).to.equal(payment);
            expect(task.status).to.equal(TaskStatus.Pending);
            expect(task.tosAccepted).to.be.true;
        });

        it("should calculate platform fee correctly", async function () {
            const payment = ethers.utils.parseEther("1.0");
            const deadline = await getDeadline(ONE_HOUR);

            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: payment
            });

            const task = await paymentRouter.getTask(0);
            // 5% fee
            expect(task.platformFee).to.equal(payment.mul(5).div(100));
        });

        it("should emit TaskCreated event", async function () {
            const payment = ethers.utils.parseEther("0.5");
            const deadline = await getDeadline(ONE_HOUR);

            await expect(
                paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                    value: payment
                })
            ).to.emit(paymentRouter, "TaskCreated")
             .withArgs(0, 0, client.address, payment);
        });

        it("should reject task with zero payment", async function () {
            const deadline = await getDeadline(ONE_HOUR);
            
            await expect(
                paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                    value: 0
                })
            ).to.be.revertedWith("Payment required");
        });

        it("should reject task with past deadline", async function () {
            const pastDeadline = Math.floor(Date.now() / 1000) - 1000;
            
            await expect(
                paymentRouter.connect(client).createTask(0, developer.address, pastDeadline, {
                    value: ethers.utils.parseEther("0.1")
                })
            ).to.be.revertedWith("Deadline must be in future");
        });
    });

    // ============ TASK COMPLETION TESTS ============
    describe("Task Completion", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
            const deadline = await getDeadline(ONE_HOUR);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("1.0")
            });
        });

        it("should complete task and pay developer", async function () {
            const devBalanceBefore = await developer.getBalance();
            
            await paymentRouter.connect(operator).completeTask(0);
            
            const task = await paymentRouter.getTask(0);
            expect(task.status).to.equal(TaskStatus.Completed);

            // Check developer received payment minus fee
            const devBalanceAfter = await developer.getBalance();
            const expectedPayout = ethers.utils.parseEther("0.95"); // 1.0 - 5% fee
            expect(devBalanceAfter.sub(devBalanceBefore)).to.equal(expectedPayout);
        });

        it("should accumulate platform fees", async function () {
            await paymentRouter.connect(operator).completeTask(0);
            
            const fees = await paymentRouter.accumulatedFees();
            expect(fees).to.equal(ethers.utils.parseEther("0.05")); // 5% of 1.0
        });

        it("should only allow operator to complete", async function () {
            await expect(paymentRouter.connect(client).completeTask(0))
                .to.be.reverted; // AccessControl revert
        });

        it("should emit TaskCompleted event", async function () {
            const expectedPayout = ethers.utils.parseEther("0.95");
            
            await expect(paymentRouter.connect(operator).completeTask(0))
                .to.emit(paymentRouter, "TaskCompleted")
                .withArgs(0, expectedPayout);
        });
    });

    // ============ REFUND TESTS ============
    describe("Refunds", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
        });

        it("should allow refund after deadline", async function () {
            // Create task with short deadline
            const deadline = await getDeadline(60); // 60 seconds in future
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("1.0")
            });

            // Wait for deadline to pass
            await ethers.provider.send("evm_increaseTime", [120]); // 2 minutes
            await ethers.provider.send("evm_mine");

            const clientBalanceBefore = await client.getBalance();
            const tx = await paymentRouter.connect(client).refundTask(0);
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const task = await paymentRouter.getTask(0);
            expect(task.status).to.equal(TaskStatus.Refunded);

            // Check client received full refund
            const clientBalanceAfter = await client.getBalance();
            expect(clientBalanceAfter.add(gasCost).sub(clientBalanceBefore))
                .to.equal(ethers.utils.parseEther("1.0"));
        });

        it("should allow operator to force refund", async function () {
            const deadline = await getDeadline(ONE_DAY);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("0.5")
            });

            await paymentRouter.connect(operator).refundTask(0);
            
            const task = await paymentRouter.getTask(0);
            expect(task.status).to.equal(TaskStatus.Refunded);
        });

        it("should emit TaskRefunded event", async function () {
            const deadline = await getDeadline(60); // 60 seconds
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("0.5")
            });

            await ethers.provider.send("evm_increaseTime", [120]); // 2 minutes
            await ethers.provider.send("evm_mine");

            await expect(paymentRouter.connect(client).refundTask(0))
                .to.emit(paymentRouter, "TaskRefunded")
                .withArgs(0, ethers.utils.parseEther("0.5"));
        });
    });

    // ============ STUCK FUNDS RECOVERY TESTS ============
    describe("Stuck Funds Recovery (48-hour Timelock)", function () {
        beforeEach(async function () {
            // Send some ETH to contract to simulate stuck funds
            await owner.sendTransaction({
                to: paymentRouter.address,
                value: ethers.utils.parseEther("5.0")
            });
        });

        it("should create withdrawal request with timelock", async function () {
            const amount = ethers.utils.parseEther("1.0");
            
            const tx = await paymentRouter.connect(owner).requestStuckFundsWithdrawal(
                amount,
                owner.address
            );
            
            await expect(tx).to.emit(paymentRouter, "WithdrawalRequested");
        });

        it("should not allow execution before timelock expires", async function () {
            const amount = ethers.utils.parseEther("1.0");
            
            const tx = await paymentRouter.connect(owner).requestStuckFundsWithdrawal(
                amount,
                owner.address
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "WithdrawalRequested");
            const requestId = event.args.requestId;

            await expect(
                paymentRouter.connect(owner).executeStuckFundsWithdrawal(
                    requestId,
                    amount,
                    owner.address
                )
            ).to.be.revertedWith("Timelock not expired");
        });

        it("should allow execution after 48 hours", async function () {
            const amount = ethers.utils.parseEther("1.0");
            
            const tx = await paymentRouter.connect(owner).requestStuckFundsWithdrawal(
                amount,
                owner.address
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "WithdrawalRequested");
            const requestId = event.args.requestId;

            // Fast forward 48 hours
            await ethers.provider.send("evm_increaseTime", [TIMELOCK_DURATION + 1]);
            await ethers.provider.send("evm_mine");

            const balanceBefore = await owner.getBalance();
            const executeTx = await paymentRouter.connect(owner).executeStuckFundsWithdrawal(
                requestId,
                amount,
                owner.address
            );
            const executeReceipt = await executeTx.wait();
            const gasCost = executeReceipt.gasUsed.mul(executeReceipt.effectiveGasPrice);

            const balanceAfter = await owner.getBalance();
            expect(balanceAfter.add(gasCost).sub(balanceBefore)).to.equal(amount);
        });

        it("should allow cancellation of withdrawal request", async function () {
            const amount = ethers.utils.parseEther("1.0");
            
            const tx = await paymentRouter.connect(owner).requestStuckFundsWithdrawal(
                amount,
                owner.address
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === "WithdrawalRequested");
            const requestId = event.args.requestId;

            await expect(paymentRouter.connect(owner).cancelWithdrawalRequest(requestId))
                .to.emit(paymentRouter, "WithdrawalCancelled")
                .withArgs(requestId);
        });
    });

    // ============ FEE WITHDRAWAL TESTS ============
    describe("Fee Withdrawal", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
            const deadline = await getDeadline(ONE_HOUR);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("1.0")
            });
            await paymentRouter.connect(operator).completeTask(0);
        });

        it("should allow admin to withdraw accumulated fees", async function () {
            const feesBefore = await paymentRouter.accumulatedFees();
            expect(feesBefore).to.equal(ethers.utils.parseEther("0.05"));

            await paymentRouter.connect(owner).withdrawFees(owner.address);

            const feesAfter = await paymentRouter.accumulatedFees();
            expect(feesAfter).to.equal(0);
        });

        it("should emit FeesWithdrawn event", async function () {
            await expect(paymentRouter.connect(owner).withdrawFees(owner.address))
                .to.emit(paymentRouter, "FeesWithdrawn")
                .withArgs(ethers.utils.parseEther("0.05"), owner.address);
        });
    });

    // ============ PAUSE TESTS ============
    describe("Emergency Pause", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
        });

        it("should pause task creation", async function () {
            await paymentRouter.connect(owner).pause();
            
            const deadline = await getDeadline(ONE_HOUR);
            await expect(
                paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                    value: ethers.utils.parseEther("0.1")
                })
            ).to.be.reverted; // Pausable revert
        });

        it("should resume after unpause", async function () {
            await paymentRouter.connect(owner).pause();
            await paymentRouter.connect(owner).unpause();
            
            const deadline = await getDeadline(ONE_HOUR);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("0.1")
            });

            expect(await paymentRouter.getTotalTasks()).to.equal(1);
        });
    });

    // ============ VIEW FUNCTION TESTS ============
    describe("View Functions", function () {
        beforeEach(async function () {
            await paymentRouter.connect(client).acceptTerms();
        });

        it("should check refund availability correctly", async function () {
            const deadline = await getDeadline(ONE_HOUR);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("0.1")
            });

            // Initially not available
            expect(await paymentRouter.isRefundAvailable(0)).to.be.false;

            // After deadline
            await ethers.provider.send("evm_increaseTime", [ONE_HOUR + 1]);
            await ethers.provider.send("evm_mine");

            expect(await paymentRouter.isRefundAvailable(0)).to.be.true;
        });

        it("should return contract balance", async function () {
            const deadline = await getDeadline(ONE_HOUR);
            await paymentRouter.connect(client).createTask(0, developer.address, deadline, {
                value: ethers.utils.parseEther("1.0")
            });

            expect(await paymentRouter.getBalance()).to.equal(ethers.utils.parseEther("1.0"));
        });
    });

    // Helper functions
    async function getDeadline(secondsInFuture) {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        return block.timestamp + secondsInFuture;
    }

    async function getBlockTimestamp() {
        const blockNumber = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNumber);
        return block.timestamp;
    }
});
