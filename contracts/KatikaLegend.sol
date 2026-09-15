// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KatikaLegend - Living Player Identity ERC-721 on Sepolia
/// @notice "Build a legend. Lock KTK into the card. Play to unlock more. Mint when the card is yours."
/// @dev Gates the floor, stores on-chain player identity stats, and evolves after 10x rollover milestones.
contract KatikaLegend {
    string public name = "Katika Legend Card";
    string public symbol = "KLEGEND";
    uint256 public constant SEPOLIA = 11155111;

    struct LegendStats {
        string name;
        string position;
        uint16 pace;
        uint16 shooting;
        uint16 passing;
        uint16 dribbling;
        uint16 defending;
        uint16 physical;
        uint16 overall;
        uint32 allocatedKtk;
        uint256 mintedAt;
        uint256 lastEvolvedAt;
        uint32 evolutionCount;
    }

    uint256 public nextTokenId = 1;
    address public owner;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public userTokenId;
    mapping(uint256 => LegendStats) public legends;
    mapping(uint256 => string) private _tokenURIs;

    event LegendMinted(
        uint256 indexed tokenId,
        address indexed player,
        string name,
        string position,
        uint16 overall,
        uint32 allocatedKtk
    );

    event LegendEvolved(
        uint256 indexed tokenId,
        uint16 overall,
        uint32 newAllocatedKtk,
        uint32 evolutionCount
    );

    modifier sepoliaOnly() {
        require(block.chainid == SEPOLIA, "Sepolia only");
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf[tokenId] == msg.sender, "Not token owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function calculateOverall(uint16[6] memory stats) public pure returns (uint16) {
        uint256 sum = stats[0] + stats[1] + stats[2] + stats[3] + stats[4] + stats[5];
        return uint16(sum / 6);
    }

    /// @notice Mint player identity to Sepolia
    function mintLegend(
        string memory playerName,
        string memory position,
        uint16[6] memory stats,
        uint32 allocatedKtk,
        string memory tokenUri
    ) external sepoliaOnly returns (uint256) {
        require(userTokenId[msg.sender] == 0, "One living card per account");
        require(bytes(playerName).length >= 2, "Invalid name");
        require(allocatedKtk > 0, "No KTK locked on card");

        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = msg.sender;
        userTokenId[msg.sender] = tokenId;

        uint16 ovr = calculateOverall(stats);

        legends[tokenId] = LegendStats({
            name: playerName,
            position: position,
            pace: stats[0],
            shooting: stats[1],
            passing: stats[2],
            dribbling: stats[3],
            defending: stats[4],
            physical: stats[5],
            overall: ovr,
            allocatedKtk: allocatedKtk,
            mintedAt: block.timestamp,
            lastEvolvedAt: block.timestamp,
            evolutionCount: 0
        });

        _tokenURIs[tokenId] = tokenUri;

        emit LegendMinted(tokenId, msg.sender, playerName, position, ovr, allocatedKtk);
        return tokenId;
    }

    /// @notice Evolve card attributes after achieving 10x table rollover
    function evolveLegend(
        uint256 tokenId,
        uint16[6] memory newStats,
        uint32 newAllocatedKtk,
        string memory newUri
    ) external sepoliaOnly onlyTokenOwner(tokenId) {
        LegendStats storage legend = legends[tokenId];
        uint16 newOvr = calculateOverall(newStats);

        legend.pace = newStats[0];
        legend.shooting = newStats[1];
        legend.passing = newStats[2];
        legend.dribbling = newStats[3];
        legend.defending = newStats[4];
        legend.physical = newStats[5];
        legend.overall = newOvr;
        legend.allocatedKtk = newAllocatedKtk;
        legend.lastEvolvedAt = block.timestamp;
        legend.evolutionCount += 1;

        _tokenURIs[tokenId] = newUri;

        emit LegendEvolved(tokenId, newOvr, newAllocatedKtk, legend.evolutionCount);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(ownerOf[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
}
