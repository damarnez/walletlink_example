import React, { useState, useEffect } from "react";
import "./App.css";
import { web3Instance } from "./Walletlinlk";
import definitions from "./definitions.json";
import Web3 from "web3";
function App() {
  const [web3, setWeb3] = useState(null);
  const [magicNumber] = useState(Math.ceil(Math.random() * 10));
  const [address, setAddress] = useState(null);
  const [contracts, setContracts] = useState(null);

  const connect = async () => {
    web3.currentProvider.enable();
    const accounts = await web3.eth.getAccounts();
    if (accounts && accounts.length > 0) setAddress(accounts[0]);
    setContracts({
      TestDani: new web3.eth.Contract(
        definitions.abi.TestDani,
        definitions.address["42"].TestDani
      )
    });
  };

  useEffect(() => {
    if (web3) {
      window.instance = web3;
      connect();
    }
  }, [web3]);

  const handleConnectWL = async () => {
    setWeb3(web3Instance);
  };
  const handleConnectMM = async () => {
    if (window.ethereum) {
      setWeb3(new Web3(window.ethereum));
    } else {
      alert("Metamask Web3 are not found!");
    }
  };

  const handleSetNum = async () => {
    await contracts.TestDani.methods.set(magicNumber).send({
      from: address,
      gas: 100000
    });
  };

  const handleGetNum = async () => {
    try {
      const data = await contracts.TestDani.methods.get().call({ gas: 100000 });
      alert("Your magic number is : " + data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>{address && <b>ADDRESS: {address}</b>}</p>
        <p>
          <button type="button" onClick={handleConnectWL}>
            Connect Wallet WalletLink
          </button>
          <button type="button" onClick={handleConnectMM}>
            Connect Wallet Metamask
          </button>
        </p>
        {contracts && (
          <>
            <p>
              Set your magic number <b>{magicNumber}</b> to the contract :
              <button type="button" onClick={handleSetNum}>
                Set Num
              </button>
            </p>
            <p>
              Recibe your magic Number from the contract
              <button type="button" onClick={handleGetNum}>
                Get Num
              </button>
            </p>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
