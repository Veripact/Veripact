// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts Upgradeable v5.0.0
pragma solidity ^0.8.22;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title VeripactReputation
 * @author Yolfry
 * @notice The central, upgradeable registry for Veripact's universal, on-chain trust profiles.
 * It records verified transactional history and badges for users across different P2P commerce niches.
 */
contract VeripactReputation is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    // =================================================================
    // ||                           STRUCTS                           ||
    // =================================================================

    /**
     * @notice Stores the aggregated reputation metrics for a user within a specific role and context (on-chain vs off-chain).
     */
    struct RoleMetrics {
        uint256 successfulTxCount;
        uint256 totalVolumeUSDC;
    }

    /**
     * @notice Stores the complete reputation profile of a user within a specific niche.
     */
    struct NicheProfile {
        RoleMetrics asSeller;
        RoleMetrics asBuyer;
    }
    
    /**
     * @notice The main user reputation profile, containing all reputation data.
     */
    struct ReputationProfile {
        mapping(bytes32 => NicheProfile) profileByNiche;
        mapping(bytes32 => bool) badges;
    }

    // =================================================================
    // ||                      STATE VARIABLES                        ||
    // =================================================================

    // The main on-chain ledger: maps a user's address to their ReputationProfile.
    mapping(address => ReputationProfile) private profiles;
    
    // A registry of processed transaction hashes to prevent replay/duplicate attacks.
    mapping(bytes32 => bool) public processedTransactionHashes;

    // =================================================================
    // ||                            EVENTS                           ||
    // =================================================================

    event TransactionVerified(address indexed seller, address indexed buyer, bytes32 indexed nicheId, uint256 volume);
    event BadgeGranted(address indexed user, bytes32 indexed badgeId);

    // =================================================================
    // ||                INITIALIZER & UPGRADEABILITY                 ||
    // =================================================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); 
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // =================================================================
    // ||                      CORE FUNCTIONS                         ||
    // =================================================================

    /**
     * @notice Records a verified off-chain transaction to the profiles of both parties.
     * @dev This is the primary function called by the backend after successful AI and counterparty verification.
     * @param seller The address of the seller.
     * @param buyer The address of the buyer.
     * @param nicheId The keccak256 hash of the human-readable niche name (e.g., "FREELANCE_DESIGN").
     * @param volumeUSDC The value of the transaction.
     * @param txHash A unique hash representing the off-chain transaction to prevent duplicates.
     */
    function addVerifiedOffchainTransaction(
        address seller,
        address buyer,
        bytes32 nicheId,
        uint256 volumeUSDC,
        bytes32 txHash
    ) external onlyOwner {
        require(!processedTransactionHashes[txHash], "Veripact: Transaction already verified.");

        // Update Seller's Profile
        NicheProfile storage sellerNicheProfile = profiles[seller].profileByNiche[nicheId];
        sellerNicheProfile.asSeller.successfulTxCount++;
        sellerNicheProfile.asSeller.totalVolumeUSDC += volumeUSDC;

        // Update Buyer's Profile
        NicheProfile storage buyerNicheProfile = profiles[buyer].profileByNiche[nicheId];
        buyerNicheProfile.asBuyer.successfulTxCount++;
        buyerNicheProfile.asBuyer.totalVolumeUSDC += volumeUSDC;

        processedTransactionHashes[txHash] = true;

        emit TransactionVerified(seller, buyer, nicheId, volumeUSDC);
    }

    /**
     * @notice Grants a non-transactional badge to a user.
     * @param user The address of the user.
     * @param badgeId The keccak256 hash of the badge name (e.g., "HUMAN_VERIFIED").
     */
    function grantBadge(address user, bytes32 badgeId) external onlyOwner {
        profiles[user].badges[badgeId] = true;
        emit BadgeGranted(user, badgeId);
    }

    // =================================================================
    // ||                       VIEW FUNCTIONS                        ||
    // =================================================================

    /**
     * @notice Retrieves the reputation metrics for a user in a specific niche.
     */
    function getNicheProfile(address user, bytes32 nicheId) external view returns (NicheProfile memory) {
        return profiles[user].profileByNiche[nicheId];
    }

    /**
     * @notice Checks if a user holds a specific badge.
     */
    function hasBadge(address user, bytes32 badgeId) external view returns (bool) {
        return profiles[user].badges[badgeId];
    }
}