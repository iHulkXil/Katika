// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IChip {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

/// @notice Testnet escrow for KCHIP on Sepolia only. Not a cash casino.
contract KatikaSepoliaVault {
    uint256 public constant SEPOLIA = 11155111;
    IChip public immutable chip;
    mapping(address => uint256) public deposited;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address chip_) {
        require(block.chainid == SEPOLIA, "Sepolia only");
        chip = IChip(chip_);
    }

    modifier sepoliaOnly() {
        require(block.chainid == SEPOLIA, "Sepolia only");
        _;
    }

    function deposit(uint256 amount) external sepoliaOnly {
        require(amount > 0, "Amount");
        require(chip.transferFrom(msg.sender, address(this), amount), "Transfer in");
        deposited[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external sepoliaOnly {
        require(deposited[msg.sender] >= amount, "Deposited");
        deposited[msg.sender] -= amount;
        require(chip.transfer(msg.sender, amount), "Transfer out");
        emit Withdrawn(msg.sender, amount);
    }
}
