// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SpaceRunnerAgents
 * @notice ERC-8004 inspired autonomous agent registry for Space Runners NPCs.
 * Each bot racer is an onchain agent with identity, stats, and the ability
 * to own assets (scores, victories). Agents react to game state: their stats
 * update after every race based on performance.
 *
 * Follows ERC-8004 concepts:
 * - Globally unique onchain identity per agent
 * - Service endpoints (game API)
 * - Reputation/stats that update based on interactions
 * - Agents can "own" achievements onchain
 */
contract SpaceRunnerAgents {
    struct Agent {
        uint256 id;
        string name;
        address wallet;
        uint256 totalRaces;
        uint256 wins;
        uint256 bestScore;
        uint256 totalDistance;
        bool registered;
    }

    mapping(uint256 => Agent) public agents;
    uint256 public agentCount;
    address public owner;

    // ERC-8004 style metadata
    string public constant AGENT_REGISTRY_TYPE = "eip155:43113:SpaceRunnerAgents";
    string public constant SERVICE_ENDPOINT = "https://space-runners.vercel.app/api/agents";

    event AgentRegistered(uint256 indexed id, string name, address wallet);
    event AgentStatsUpdated(uint256 indexed id, uint256 races, uint256 wins, uint256 bestScore);
    event RaceCompleted(address indexed player, uint256 playerScore, uint256[4] botScores);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @notice Register a new autonomous agent (bot racer)
     * @param _name Agent display name
     * @param _wallet Agent's onchain wallet address (can hold assets)
     */
    function registerAgent(string calldata _name, address _wallet) external onlyOwner returns (uint256) {
        uint256 id = agentCount;
        agents[id] = Agent({
            id: id,
            name: _name,
            wallet: _wallet,
            totalRaces: 0,
            wins: 0,
            bestScore: 0,
            totalDistance: 0,
            registered: true
        });
        agentCount++;
        emit AgentRegistered(id, _name, _wallet);
        return id;
    }

    /**
     * @notice Batch register all 4 bot racers
     */
    function registerAllBots(
        address _wallet0,
        address _wallet1,
        address _wallet2,
        address _wallet3
    ) external onlyOwner {
        _registerBot("CryptoKid", _wallet0);
        _registerBot("HODLer", _wallet1);
        _registerBot("DeFiDegen", _wallet2);
        _registerBot("MoonBoy", _wallet3);
    }

    function _registerBot(string memory _name, address _wallet) internal {
        uint256 id = agentCount;
        agents[id] = Agent({
            id: id,
            name: _name,
            wallet: _wallet,
            totalRaces: 0,
            wins: 0,
            bestScore: 0,
            totalDistance: 0,
            registered: true
        });
        agentCount++;
        emit AgentRegistered(id, _name, _wallet);
    }

    /**
     * @notice Update agent stats after a race. Called when player saves score.
     * Agents "react" to game state — their performance is recorded onchain.
     * @param _botScores Array of 4 bot scores from the race
     * @param _botDistances Array of 4 bot distances from the race
     * @param _playerScore Player's score (to determine if a bot won)
     */
    function updateRaceResults(
        uint256[4] calldata _botScores,
        uint256[4] calldata _botDistances,
        uint256 _playerScore
    ) external {
        require(agentCount >= 4, "Bots not registered");

        for (uint256 i = 0; i < 4; i++) {
            Agent storage agent = agents[i];
            agent.totalRaces++;
            agent.totalDistance += _botDistances[i];

            if (_botScores[i] > agent.bestScore) {
                agent.bestScore = _botScores[i];
            }

            // Bot wins if its score beats the player
            if (_botScores[i] > _playerScore) {
                agent.wins++;
            }

            emit AgentStatsUpdated(i, agent.totalRaces, agent.wins, agent.bestScore);
        }

        emit RaceCompleted(msg.sender, _playerScore, _botScores);
    }

    /**
     * @notice Get agent data (ERC-8004 style identity query)
     */
    function getAgent(uint256 _id) external view returns (Agent memory) {
        require(agents[_id].registered, "Agent not found");
        return agents[_id];
    }

    /**
     * @notice Get all registered agents
     */
    function getAllAgents() external view returns (Agent[] memory) {
        Agent[] memory all = new Agent[](agentCount);
        for (uint256 i = 0; i < agentCount; i++) {
            all[i] = agents[i];
        }
        return all;
    }

    /**
     * @notice ERC-8004 style: get agent's service endpoint
     */
    function getAgentURI(uint256 _id) external view returns (string memory) {
        require(agents[_id].registered, "Agent not found");
        return SERVICE_ENDPOINT;
    }
}
