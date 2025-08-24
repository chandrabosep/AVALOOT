export const GeoStakeABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "SafeERC20FailedOperation",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "claimer",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "claimerAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "stakerReward",
				"type": "uint256"
			}
		],
		"name": "Claimed",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Refunded",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "RewardWithdrawn",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "int256",
				"name": "lat",
				"type": "int256"
			},
			{
				"indexed": false,
				"internalType": "int256",
				"name": "lng",
				"type": "int256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "expiresAt",
				"type": "uint256"
			}
		],
		"name": "Staked",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "oldPercentage",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "newPercentage",
				"type": "uint256"
			}
		],
		"name": "StakerRewardPercentageUpdated",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "MAX_COORDINATE",
		"outputs": [
			{
				"internalType": "int256",
				"name": "",
				"type": "int256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MAX_STAKER_REWARD",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MIN_COORDINATE",
		"outputs": [
			{
				"internalType": "int256",
				"name": "",
				"type": "int256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "MIN_DURATION",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			}
		],
		"name": "claim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "int256",
				"name": "minLat",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "maxLat",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "minLng",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "maxLng",
				"type": "int256"
			}
		],
		"name": "getActiveStakesInRange",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "activeStakeIds",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			}
		],
		"name": "getStake",
		"outputs": [
			{
				"components": [
					{
						"internalType": "address",
						"name": "staker",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "token",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "int256",
						"name": "latitude",
						"type": "int256"
					},
					{
						"internalType": "int256",
						"name": "longitude",
						"type": "int256"
					},
					{
						"internalType": "uint256",
						"name": "expiresAt",
						"type": "uint256"
					},
					{
						"internalType": "bool",
						"name": "claimed",
						"type": "bool"
					}
				],
				"internalType": "struct GeoStake.Stake",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "getStakerRewards",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			}
		],
		"name": "isStakeActive",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			}
		],
		"name": "isStakeExpired",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "stakeId",
				"type": "uint256"
			}
		],
		"name": "refund",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "newPercentage",
				"type": "uint256"
			}
		],
		"name": "setStakerRewardPercentage",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "int256",
				"name": "lat",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "lng",
				"type": "int256"
			},
			{
				"internalType": "uint256",
				"name": "duration",
				"type": "uint256"
			}
		],
		"name": "stake",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "stakeCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "stakerRewardPercentage",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "stakerRewards",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "stakes",
		"outputs": [
			{
				"internalType": "address",
				"name": "staker",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "int256",
				"name": "latitude",
				"type": "int256"
			},
			{
				"internalType": "int256",
				"name": "longitude",
				"type": "int256"
			},
			{
				"internalType": "uint256",
				"name": "expiresAt",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "claimed",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "withdrawRewards",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]