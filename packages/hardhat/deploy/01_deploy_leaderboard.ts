import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployLeaderboard: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("CryptoRunnerLeaderboard", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

export default deployLeaderboard;

deployLeaderboard.tags = ["CryptoRunnerLeaderboard"];
