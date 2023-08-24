// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


contract OwnerHeir is Ownable {
    address public heir;
    uint256 public lastWithdrawalTimestamp;
    uint256 public takePosesionCooldown = 30 days;

    event Withdrawal(address indexed owner, uint256 amount);
    event TakePossession(
        address indexed oldOwner,
        address indexed newOwner,
        address newHeir
    );

    modifier onlyHeir() {
        require(msg.sender == heir, "Only the heir can call this function");
        _;
    }

    constructor(address _heir) {
        heir = _heir;
        lastWithdrawalTimestamp = block.timestamp;
    }

    function takePossession(address _newHeir) external onlyHeir {
        require(
            block.timestamp - lastWithdrawalTimestamp > takePosesionCooldown,
            "Too soon to take posesion of the contract"
        );
        require(_newHeir != address(0), "Invalid heir address");
        address oldOwner = owner();
        heir = _newHeir;
        transferOwnership(heir);
        emit TakePossession(oldOwner, owner(), heir);
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        // Reset timestamp
        lastWithdrawalTimestamp = block.timestamp;
        
        (bool sent,) = owner().call{value: _amount}("");
        require(sent, "Failed to send Ether");

        emit Withdrawal(owner(), _amount);
    }

    // receive() external payable {}
    receive() external payable {}
}
