// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GeoStake is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    struct Stake {
        address staker;
        address token;      // ERC20 token address
        uint256 amount;
        int256 latitude;    // scaled *1e6 to avoid float
        int256 longitude;   // scaled *1e6
        uint256 expiresAt;
        bool claimed;
    }
    
    uint256 public stakeCount;
    mapping(uint256 => Stake) public stakes;
    
    // Configuration
    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 365 days;
    int256 public constant MAX_COORDINATE = 180_000_000; // 180 degrees * 1e6
    int256 public constant MIN_COORDINATE = -180_000_000; // -180 degrees * 1e6
    
    // Incentive model configuration
    uint256 public stakerRewardPercentage = 500; // 5% in basis points (500/10000 = 0.05)
    uint256 public constant MAX_STAKER_REWARD = 2000; // Max 20% to prevent abuse
    address public owner;
    
    // Track total rewards earned by stakers
    mapping(address => mapping(address => uint256)) public stakerRewards; // staker => token => amount
    
    event Staked(
        uint256 indexed stakeId, 
        address indexed staker, 
        address indexed token, 
        uint256 amount, 
        int256 lat, 
        int256 lng, 
        uint256 expiresAt
    );
    event Claimed(
        uint256 indexed stakeId, 
        address indexed claimer, 
        address indexed staker,
        uint256 claimerAmount,
        uint256 stakerReward
    );
    event Refunded(uint256 indexed stakeId, address indexed staker, uint256 amount);
    event StakerRewardPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event RewardWithdrawn(address indexed staker, address indexed token, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validCoordinates(int256 lat, int256 lng) {
        require(lat >= -90_000_000 && lat <= 90_000_000, "Invalid latitude");
        require(lng >= -180_000_000 && lng <= 180_000_000, "Invalid longitude");
        _;
    }
    
    modifier validStake(uint256 stakeId) {
        require(stakeId < stakeCount, "Stake does not exist");
        _;
    }
    
    function stake(
        address token, 
        uint256 amount, 
        int256 lat, 
        int256 lng, 
        uint256 duration
    ) 
        external 
        payable
        nonReentrant 
        validCoordinates(lat, lng) 
    {
        require(amount > 0, "Invalid amount");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        
        if (token == address(0)) {
            // Native token (AVAX) staking
            require(msg.value == amount, "Sent value must equal amount");
        } else {
            // ERC20 token staking
            require(msg.value == 0, "Do not send native tokens when staking ERC20");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        uint256 stakeId = stakeCount;
        stakes[stakeId] = Stake({
            staker: msg.sender,
            token: token,
            amount: amount,
            latitude: lat,
            longitude: lng,
            expiresAt: block.timestamp + duration,
            claimed: false
        });
        
        emit Staked(stakeId, msg.sender, token, amount, lat, lng, block.timestamp + duration);
        stakeCount++;
    }
    
    function claim(uint256 stakeId) 
        external 
        nonReentrant 
        validStake(stakeId) 
    {
        Stake storage s = stakes[stakeId];
        require(!s.claimed, "Already claimed");
        require(block.timestamp < s.expiresAt, "Stake expired");
        require(s.staker != msg.sender, "Cannot claim own stake");
        
        s.claimed = true;
        
        // Calculate amounts: staker gets stakerRewardPercentage, claimer gets the rest
        uint256 stakerReward = (s.amount * stakerRewardPercentage) / 10000;
        uint256 claimerAmount = s.amount - stakerReward;
        
        // Add to staker's accumulated rewards
        stakerRewards[s.staker][s.token] += stakerReward;
        
        if (s.token == address(0)) {
            // Native token (AVAX) transfer to claimer
            (bool success, ) = payable(msg.sender).call{value: claimerAmount}("");
            require(success, "Native token transfer failed");
        } else {
            // ERC20 token transfer to claimer
            IERC20(s.token).safeTransfer(msg.sender, claimerAmount);
        }
        
        emit Claimed(stakeId, msg.sender, s.staker, claimerAmount, stakerReward);
    }
    
    function refund(uint256 stakeId) 
        external 
        nonReentrant 
        validStake(stakeId) 
    {
        Stake storage s = stakes[stakeId];
        require(!s.claimed, "Already claimed");
        require(block.timestamp >= s.expiresAt, "Stake not expired yet");
        require(s.staker == msg.sender, "Not the original staker");
        
        s.claimed = true; // Mark as resolved
        
        if (s.token == address(0)) {
            // Native token (AVAX) refund
            (bool success, ) = payable(msg.sender).call{value: s.amount}("");
            require(success, "Native token refund failed");
        } else {
            // ERC20 token refund
            IERC20(s.token).safeTransfer(msg.sender, s.amount);
        }
        
        emit Refunded(stakeId, msg.sender, s.amount);
    }
    
    // Staker reward functions
    function withdrawRewards(address token) external nonReentrant {
        uint256 amount = stakerRewards[msg.sender][token];
        require(amount > 0, "No rewards to withdraw");
        
        stakerRewards[msg.sender][token] = 0;
        
        if (token == address(0)) {
            // Native token (AVAX) withdrawal
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Native token withdrawal failed");
        } else {
            // ERC20 token withdrawal
            IERC20(token).safeTransfer(msg.sender, amount);
        }
        
        emit RewardWithdrawn(msg.sender, token, amount);
    }
    
    function getStakerRewards(address staker, address token) external view returns (uint256) {
        return stakerRewards[staker][token];
    }
    
    // Owner functions
    function setStakerRewardPercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage <= MAX_STAKER_REWARD, "Percentage too high");
        uint256 oldPercentage = stakerRewardPercentage;
        stakerRewardPercentage = newPercentage;
        emit StakerRewardPercentageUpdated(oldPercentage, newPercentage);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // View functions
    function getStake(uint256 stakeId) 
        external 
        view 
        validStake(stakeId) 
        returns (Stake memory) 
    {
        return stakes[stakeId];
    }
    
    function isStakeActive(uint256 stakeId) 
        external 
        view 
        validStake(stakeId) 
        returns (bool) 
    {
        Stake memory s = stakes[stakeId];
        return !s.claimed && block.timestamp < s.expiresAt;
    }
    
    function isStakeExpired(uint256 stakeId) 
        external 
        view 
        validStake(stakeId) 
        returns (bool) 
    {
        Stake memory s = stakes[stakeId];
        return !s.claimed && block.timestamp >= s.expiresAt;
    }
    
    // Get active stakes in a coordinate range (basic implementation)
    function getActiveStakesInRange(
        int256 minLat, 
        int256 maxLat, 
        int256 minLng, 
        int256 maxLng
    ) 
        external 
        view 
        returns (uint256[] memory activeStakeIds) 
    {
        uint256[] memory tempIds = new uint256[](stakeCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < stakeCount; i++) {
            Stake memory s = stakes[i];
            if (!s.claimed && 
                block.timestamp < s.expiresAt &&
                s.latitude >= minLat && s.latitude <= maxLat &&
                s.longitude >= minLng && s.longitude <= maxLng) {
                tempIds[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        activeStakeIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            activeStakeIds[i] = tempIds[i];
        }
    }
}