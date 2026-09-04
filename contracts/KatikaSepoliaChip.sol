// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Testnet chip only. Reverts on any chain except Sepolia (11155111).
contract KatikaSepoliaChip {
    string public name = "Katika Sepolia Chip";
    string public symbol = "KCHIP";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    uint256 public constant CLAIM_AMOUNT = 1000 ether;
    uint256 public constant CLAIM_COOLDOWN = 1 hours;
    uint256 public constant SEPOLIA = 11155111;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastClaim;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier sepoliaOnly() {
        require(block.chainid == SEPOLIA, "Sepolia only");
        _;
    }

    function claim() external sepoliaOnly {
        require(block.timestamp >= lastClaim[msg.sender] + CLAIM_COOLDOWN, "Wait to claim");
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
    }

    function transfer(address to, uint256 value) external sepoliaOnly returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external sepoliaOnly returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external sepoliaOnly returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "Allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "Zero");
        require(balanceOf[from] >= value, "Balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
