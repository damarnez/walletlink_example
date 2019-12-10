pragma solidity >=0.4.0 <0.7.0;

contract SimpleStorage {
    uint storedData;

    function set(uint x) public {
        for (uint i = 0; i < x; i++) {
            storedData = storedData + 1;
        }
      
    }

    function get() public view returns (uint) {
        return storedData;
    }
}