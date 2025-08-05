// scripts/deploy.js
const { ethers, upgrades } = require("hardhat");

/**
 * @notice This script deploys the VeripactReputation contract as an upgradeable UUPS proxy.
 * @dev It uses the @openzeppelin/hardhat-upgrades plugin to handle the complex proxy deployment process.
 */
async function main() {
  // --- 1. Configuration ---
  
  // The public address of the wallet that will become the initial owner of the contract.
  // This should be the address of your backend agent's wallet.
  const initialOwner = "0xD94512a936059b49021EE9FD2aADE182Fa7b1020";
  
  // --- 2. Deployment ---

  console.log("Fetching the contract factory for VeripactReputation...");
  const VeripactReputationFactory = await ethers.getContractFactory("VeripactReputation");
  
  console.log("Deploying the proxy and the initial implementation contract...");
  
  // The deployProxy function from the upgrades plugin is the key. It does three things:
  //   1. Deploys the main logic contract (VeripactReputation).
  //   2. Deploys the proxy contract that users will interact with.
  //   3. Calls the `initialize` function on the contract to set the initial state.
  const veripactReputationProxy = await upgrades.deployProxy(
    VeripactReputationFactory, 
    [initialOwner], // Arguments for the `initialize` function
    {
      initializer: "initialize", // Specifies which function to call for initialization
      kind: "uups"             // Specifies that we are using the UUPS upgradeable pattern
    }
  );
  
  await veripactReputationProxy.waitForDeployment();
  
  // --- 3. Verification ---

  const proxyAddress = await veripactReputationProxy.getAddress();
  console.log("✅ VeripactReputation (Proxy) has been successfully deployed to:", proxyAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});