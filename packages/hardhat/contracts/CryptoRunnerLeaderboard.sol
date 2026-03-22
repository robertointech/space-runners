// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CryptoRunnerLeaderboard {
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 correctAnswers;
        uint256 timestamp;
    }

    struct PlayerStats {
        uint256 bestScore;
        uint256 gamesPlayed;
        uint256 totalCorrectAnswers;
    }

    ScoreEntry[] public topScores;
    uint256 public constant MAX_LEADERBOARD = 10;
    uint256 public totalPlayers;

    mapping(address => PlayerStats) public playerStats;
    mapping(address => bool) public hasPlayed;

    event NewScore(address indexed player, uint256 score, uint256 correctAnswers, uint256 timestamp);
    event NewTopScore(address indexed player, uint256 score, uint256 rank);

    function submitScore(uint256 _score, uint256 _correctAnswers) external {
        require(_score > 0, "Score must be > 0");

        PlayerStats storage stats = playerStats[msg.sender];
        if (!hasPlayed[msg.sender]) {
            hasPlayed[msg.sender] = true;
            totalPlayers++;
        }
        stats.gamesPlayed++;
        stats.totalCorrectAnswers += _correctAnswers;
        if (_score > stats.bestScore) {
            stats.bestScore = _score;
        }

        emit NewScore(msg.sender, _score, _correctAnswers, block.timestamp);

        if (topScores.length < MAX_LEADERBOARD) {
            topScores.push(ScoreEntry(msg.sender, _score, _correctAnswers, block.timestamp));
            _sortLeaderboard();
            emit NewTopScore(msg.sender, _score, _findRank(msg.sender, _score));
        } else if (_score > topScores[topScores.length - 1].score) {
            topScores[topScores.length - 1] = ScoreEntry(msg.sender, _score, _correctAnswers, block.timestamp);
            _sortLeaderboard();
            emit NewTopScore(msg.sender, _score, _findRank(msg.sender, _score));
        }
    }

    function getLeaderboard() external view returns (ScoreEntry[] memory) {
        return topScores;
    }

    function getLeaderboardLength() external view returns (uint256) {
        return topScores.length;
    }

    function getPlayerStats(address _player) external view returns (PlayerStats memory) {
        return playerStats[_player];
    }

    function _sortLeaderboard() internal {
        uint256 len = topScores.length;
        for (uint256 i = 1; i < len; i++) {
            ScoreEntry memory key = topScores[i];
            int256 j = int256(i) - 1;
            while (j >= 0 && topScores[uint256(j)].score < key.score) {
                topScores[uint256(j + 1)] = topScores[uint256(j)];
                j--;
            }
            topScores[uint256(j + 1)] = key;
        }
    }

    function _findRank(address _player, uint256 _score) internal view returns (uint256) {
        for (uint256 i = 0; i < topScores.length; i++) {
            if (topScores[i].player == _player && topScores[i].score == _score) {
                return i + 1;
            }
        }
        return 0;
    }
}
