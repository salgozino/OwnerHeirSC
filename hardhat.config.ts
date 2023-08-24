import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.0",
  },
};


export default config;
