import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

const deployAgents: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const result = await deploy("SpaceRunnerAgents", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // Register the 4 bot agents with deterministic addresses
  if (result.newlyDeployed) {
    const contract = await hre.ethers.getContract("SpaceRunnerAgents", deployer);

    // Generate deterministic bot wallet addresses
    const botWallets = [
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
    ];

    console.log("Registering 4 bot agents...");
    const tx = await (contract as any).registerAllBots(botWallets[0], botWallets[1], botWallets[2], botWallets[3]);
    await tx.wait();
    console.log("Bot agents registered:", botWallets);
  }
};

export default deployAgents;
deployAgents.tags = ["SpaceRunnerAgents"];
