import { expect } from "chai";
import hre from "hardhat";
import { OwnerHire } from "../typechain-types";
import { Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("OwnerHire Contract", function () {
  let ownerHeir: OwnerHire;
  let owner: Signer;
  let heir: Signer;
  let thirdParty: Signer;

  beforeEach(async function () {
    [owner, heir, thirdParty] = await hre.ethers.getSigners();
    ownerHeir = await hre.ethers.deployContract("OwnerHeir", [
      await heir.getAddress(),
    ]);
    await ownerHeir.waitForDeployment();

  });

  it("Should have proper heir and owner", async function () {
    expect(await ownerHeir.heir()).to.equal(await heir.getAddress());
    expect(await ownerHeir.owner()).to.equal(await owner.getAddress());
  });

  it("Should not allow the heir to take possession before time", async function () {
    await time.increase(60*60*24*29);  // increase the time in 29 days (cooldown -1 day)
    expect(
      ownerHeir.connect(heir).takePossession(await heir.getAddress())
    ).to.revertedWith("Too soon to take posesion of the contract");
  });

  it("Should allow the heir to take possession after time", async function () {
    await time.increase(60*60*24*30);  // increase the time in 30 days
    expect(
      ownerHeir.connect(heir).takePossession(await heir.getAddress())
    ).to.not.revertedWith("Too soon to take posesion of the contract");
  });

  it("Should revert if non-heir tries to take possession", async function () {
    await time.increase(60*60*24*30);  // increase the time in 30 days
    await expect(
      ownerHeir.takePossession(await heir.getAddress())
    ).to.be.revertedWith("Only the heir can call this function");
  });

  it("Should receive funds by anyone", async function () {
    const ethValue = hre.ethers.parseEther("1.0");
    expect(await owner.sendTransaction({
      to: ownerHeir.target,
      value: ethValue, // Sends exactly 1.0 ether
    })).to.not.reverted;
    expect(await hre.ethers.provider.getBalance(ownerHeir.target)).to.be.equal(ethValue);

  });

  it("Should allow the owner to withdraw funds", async function () {
    const ethValue = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await ownerHeir.getAddress(),
      value: ethValue, // Sends exactly 1.0 ether
    });
    let contractBalance = await hre.ethers.provider.getBalance(
      await ownerHeir.getAddress()
    );
    expect(contractBalance).to.equal(hre.ethers.parseEther("1.0"));
    await ownerHeir.withdraw(contractBalance);
    contractBalance = await hre.ethers.provider.getBalance(await ownerHeir.getAddress());
    expect(contractBalance).to.equal(0);
  });

  it("Should revert if withdrawing more funds than balance", async function () {
    const ethValue = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await ownerHeir.getAddress(),
      value: ethValue, // Sends exactly 1.0 ether
    });
    let contractBalance = await hre.ethers.provider.getBalance(
      await ownerHeir.getAddress()
    );
    expect(contractBalance).to.equal(hre.ethers.parseEther("1.0"));
    await expect(ownerHeir.withdraw(ethValue * BigInt(2))).to.be.rejectedWith("Insufficient balance");
  });

  it("Should revert if non-owner tries to withdraw funds", async function () {
    const ethValue = hre.ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await ownerHeir.getAddress(),
      value: ethValue, // Sends exactly 1.0 ether
    });
    let contractBalance = await hre.ethers.provider.getBalance(
      await ownerHeir.getAddress()
    );
    expect(contractBalance).to.equal(hre.ethers.parseEther("1.0"));
    await expect(
      ownerHeir.connect(thirdParty).withdraw(contractBalance)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should reset cooldown time when withdrawing 0 value", async function () {
    const currentTimestamp = await ownerHeir.lastWithdrawalTimestamp()
    await time.increase(600);
    await ownerHeir.connect(owner).withdraw(0);
    const newTimestamp = await ownerHeir.lastWithdrawalTimestamp();
    expect(newTimestamp).to.be.greaterThan(currentTimestamp + BigInt(600));
    
  });

});
