import WalletLink from "walletlink";
import Web3 from "web3";

const INFURA_KEY = process.env.REACT_APP_INFURA_KEY;
if (!INFURA_KEY) {
  console.log("INFURA ", INFURA_KEY);
  throw new Error("INFURA KEY NEEDED");
}
export const walletLink = new WalletLink({
  appName: "My Awesome DApp",
  appLogoUrl: "https://static.herodev.es/favicons/favicon.ico`"
});

export const ethereum = walletLink.makeWeb3Provider(
  `https://kovan.infura.io/v3/${INFURA_KEY}`,
  42
);

export const web3Instance = new Web3(ethereum);
