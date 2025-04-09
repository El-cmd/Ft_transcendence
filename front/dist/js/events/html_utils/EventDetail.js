import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";
import { EventHTMLUtils } from './EventHTMLUtils.js';
import { EventFetcher } from "../EventFetcher.js";
import { router } from "../../Router.js";
import { eventWebSocket } from "../../services/EventWsManager.js";

export class EventDetail extends EventHTMLUtils {
    constructor(event) {
        super(event);
        this.init();
    }

    get eventDetail() {
        return this.container;
    }

    set_title(){
        
    }

    init() {
        console.log('detail for', this.event);
        this.container = document.getElementById('event_detail_container');
        this.container.innerHTML = '';
        
        this.loadCommonElements();
        
        // Load state-specific elements
        if (this.event.has_begin) {
            if (!this.event.is_over) {
                const statusHeading = document.createElement('h1');
                statusHeading.textContent = 'Event in progress...';
                this.container.appendChild(statusHeading);
            }
            this.loadCompletedEventPlayersTable();

            if (this.event.type_str === 'tournament') {
                this.loadTournamentSpecificElements();
            }
        } else {
            this.loadUpcomingEventView();
        }
    }
    
    loadCommonElements() {
        // Create basic details that are shown for all event states
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'event-details-container';
        this.container.appendChild(this.createLambdaInto('h1', () => { 
            return document.createTextNode(this.event.name); 
        }));
        const detailsItems = [
            () => { return document.createTextNode('Description: ' + this.event.description); },
            () => { return document.createTextNode('Visibility: ' + (this.event.is_public ? 'Public' : 'Private')); },
            () => { return document.createTextNode('Max Players: ' + this.event.max_players); },
            () => { return document.createTextNode('Score to win: ' + this.event.score_to_win); },
        ];
        
        this.createLamdbasIntoContainer(detailsContainer, detailsItems, 'p');
        this.container.appendChild(detailsContainer);
    }
    
    isCurrentUser(userId) {
        return userId == localStorage.getItem('current_id');
    }
    
    loadCompletedEventPlayersTable() {
        // Create players results table for completed events
        const playersTable = document.createElement('table');
        const playersTableHead = document.createElement('thead');
        const playersTableHeadRow = document.createElement('tr');
        const headers = ['Username', 'Score', 'Rank'];
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            playersTableHeadRow.appendChild(th);
        });
        
        playersTableHead.appendChild(playersTableHeadRow);
        playersTable.appendChild(playersTableHead);

        const playersTableBody = document.createElement('tbody');
        for (let player of this.event.players) {
            const playerRow = document.createElement('tr');
            
            // Highlight current user's row
            if (this.isCurrentUser(player.user)) {
                playerRow.classList.add('current-user-row');
            }
            
            // Username cell
            const usernameCell = document.createElement('td');
            usernameCell.appendChild(this.createPlayerProfileLink(player));
            playerRow.appendChild(usernameCell);

            // Score cell
            const scoreCell = document.createElement('td');
            scoreCell.textContent = player.gave_up === true ? 'Gave up' : player.score;
            playerRow.appendChild(scoreCell);

            // Rank cell
            const rankCell = document.createElement('td');
            rankCell.textContent = player.rank;
            playerRow.appendChild(rankCell);

            playersTableBody.appendChild(playerRow);
        }
        
        playersTable.appendChild(playersTableBody);
        this.container.appendChild(playersTable);
    }
    
    loadUpcomingEventView() {
        // Display for events that haven't started yet

        this.container.appendChild(this.createLambdaInto('h1', () => { 
            return document.createTextNode('Upcoming Event: ' + this.event.name); 
        }));
        
        this.loadRegisteredPlayersTable();
        this.loadInvitedPlayersTable();
    }
    
    loadRegisteredPlayersTable() {
        // Create registered players section
        const playersContainer = document.createElement('div');
        playersContainer.className = 'registered-players-container';
        
        const playersTitle = document.createElement('h3');
        playersTitle.textContent = 'Registered Players';
        playersContainer.appendChild(playersTitle);
        
        // Create players table
        const playersTable = document.createElement('table');
        const playersTableHead = document.createElement('thead');
        const playersTableHeadRow = document.createElement('tr');
        
        ['Username', 'Status'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            playersTableHeadRow.appendChild(th);
        });
        
        playersTableHead.appendChild(playersTableHeadRow);
        playersTable.appendChild(playersTableHead);
        
        const playersTableBody = document.createElement('tbody');
        
        // Add registered players to table
        if (this.event.players && this.event.players.length > 0) {
            for (let player of this.event.players) {
                const playerRow = document.createElement('tr');
                
                // Highlight current user's row
                if (this.isCurrentUser(player.user)) {
                    playerRow.classList.add('current-user-row');
                }
                
                // Username cell with link to profile
                const usernameCell = document.createElement('td');
                usernameCell.appendChild(this.createPlayerProfileLink(player));
                playerRow.appendChild(usernameCell);
                
                // Status cell
                const statusCell = document.createElement('td');
                statusCell.textContent = player.ready ? 'Ready' : 'Registered';
                playerRow.appendChild(statusCell);
                
                playersTableBody.appendChild(playerRow);
            }
        } else {
            // No players registered yet
            const noPlayersRow = document.createElement('tr');
            const noPlayersCell = document.createElement('td');
            noPlayersCell.colSpan = 2;
            noPlayersCell.textContent = 'No players registered yet';
            noPlayersCell.style.textAlign = 'center';
            noPlayersRow.appendChild(noPlayersCell);
            playersTableBody.appendChild(noPlayersRow);
        }
        
        playersTable.appendChild(playersTableBody);
        playersContainer.appendChild(playersTable);
        this.container.appendChild(playersContainer);
    }
    
    loadInvitedPlayersTable() {
        // Add invited players section
        if (this.event.inviteds && this.event.inviteds.length > 0) {
            const invitedContainer = document.createElement('div');
            invitedContainer.className = 'invited-players-container';
            
            const invitedTitle = document.createElement('h3');
            invitedTitle.textContent = 'Invited Players';
            invitedContainer.appendChild(invitedTitle);
            
            // Create invited players table
            const invitedTable = document.createElement('table');
            const invitedTableHead = document.createElement('thead');
            const invitedTableHeadRow = document.createElement('tr');
            
            ['Username'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                invitedTableHeadRow.appendChild(th);
            });
            
            invitedTableHead.appendChild(invitedTableHeadRow);
            invitedTable.appendChild(invitedTableHead);
            
            const invitedTableBody = document.createElement('tbody');
            
            // Add invited players to table
            for (let invited of this.event.inviteds) {
                const invitedRow = document.createElement('tr');
                
                // Highlight current user's row
                if (this.isCurrentUser(invited.user)) {
                    invitedRow.classList.add('current-user-row');
                }
                
                // Username cell with link to profile
                const usernameCell = document.createElement('td');
                usernameCell.appendChild(this.createPlayerProfileLink(invited));
                invitedRow.appendChild(usernameCell);
                
                invitedTableBody.appendChild(invitedRow);
            }
            
            invitedTable.appendChild(invitedTableBody);
            invitedContainer.appendChild(invitedTable);
            this.container.appendChild(invitedContainer);
        }
    }
    
    createPlayerProfileLink(player) {
        const displayName = this.getPlayerDisplayName(player);
        return this.createRef(displayName, () => {
            HTMLUtils.redirect(`#/profiles/:${player.user}`);
            return false;
        });
    }
    
    getPlayerDisplayName(player) {
        return player.userevent_name || 'Unknown Player';
    }


    loadTournamentSpecificElements() {
    // Only proceed if we have tournament data
    if (!this.event.event_games) return;
    
    // Create tournament bracket container
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'tournament-bracket-container';
    
    // Create title
    const bracketTitle = document.createElement('h2');
    bracketTitle.textContent = 'Tournament Bracket';
    bracketTitle.className = 'tournament-bracket-title';
    bracketContainer.appendChild(bracketTitle);
    
    // Create the main bracket display
    const bracketDisplay = document.createElement('div');
    bracketDisplay.className = 'tournament-bracket-display';
    
    // Create player reference area (above the bracket)
    const playerReferences = document.createElement('div');
    playerReferences.className = 'tournament-player-references';
    
    // Track player colors for consistent coloring
    const playerColors = {};
    const colorPalette = [
        '#00FFFF', // Cyan
        '#FF00FF', // Magenta
        '#FFFF00', // Yellow
        '#00FF00', // Green
        '#FF3366', // Pink
        '#33CCFF', // Light Blue
        '#FF9933', // Orange
        '#99FF33', // Lime
        '#CC33FF', // Purple
        '#33FFCC', // Turquoise
    ];
    
    let colorIndex = 0;
    
    // Get all tournament players
    const tournamentPlayers = [];
    for (let player of this.event.players) {
        tournamentPlayers.push(player);
        
        // Assign a color to this player
        if (!playerColors[player.user]) {
            playerColors[player.user] = colorPalette[colorIndex % colorPalette.length];
            colorIndex++;
        }
    }
    
    // Create player reference elements
    tournamentPlayers.forEach(player => {
        const playerRef = document.createElement('div');
        playerRef.className = 'tournament-player-ref';
        playerRef.style.borderColor = playerColors[player.user];
        
        const playerLink = this.createPlayerProfileLink(player);
        playerRef.appendChild(playerLink);
        
        playerReferences.appendChild(playerRef);
    });
    
    bracketContainer.appendChild(playerReferences);
    
    // Define round names for display
    const roundNames = ['Final', 'Semifinals', 'Quarterfinals', 'Round of 16', 'Round of 32', 'Round of 64'];
    
    // Create rounds from first to last (reverse order of tournament.event_games)
    const rounds = Object.keys(this.event.event_games).sort((a, b) => b - a);
    
    // Create bracket structure
    const bracketStructure = document.createElement('div');
    bracketStructure.className = 'tournament-bracket-structure';
    
    rounds.forEach(roundIndex => {
        const roundData = this.event.event_games[roundIndex];
        const roundKey = Object.keys(roundData)[0]; // e.g. "final", "semi", etc.
        const games = roundData[roundKey];
        
        // Create round column
        const roundColumn = document.createElement('div');
        roundColumn.className = 'tournament-round';
        roundColumn.dataset.round = roundIndex;
        
        // Round header
        const roundHeader = document.createElement('h4');
        roundHeader.textContent = roundNames[roundIndex] || `Round ${roundIndex}`;
        roundColumn.appendChild(roundHeader);
        
        // Create game elements for this round
        games.forEach((gameId, gameIndex) => {
            const gameBox = document.createElement('div');
            gameBox.className = 'tournament-game';
            gameBox.dataset.gameId = gameId;
            
            // Find the game data if available
            const game = this.event.event_games[roundIndex][roundKey][gameIndex];

            gameBox.style.cursor = 'pointer';
            gameBox.addEventListener('click', () => {
                HTMLUtils.redirect(`#/event/:${gameId.id}`);
            });
            
            if (game) {
                // Game has data
                if (game.has_begin) {
                    // Game has started or finished
                    game.players.forEach(player => {
                        const playerElement = document.createElement('div');
                        playerElement.className = 'tournament-game-player';
                        
                        // Add player name
                        const playerName = this.getPlayerDisplayName(player);
                        playerElement.textContent = playerName;
                        
                        // Mark winner
                        if (game.is_over && player.rank === 1) {
                            playerElement.classList.add('tournament-game-winner');
                        }
                        
                        // Apply player color
                        if (playerColors[player.user]) {
                            playerElement.style.borderLeftColor = playerColors[player.user];
                        }
                        
                        gameBox.appendChild(playerElement);
                    });
                    
                    // Add score information if game is over
                    if (game.is_over) {
                        const scoreElement = document.createElement('div');
                        scoreElement.className = 'tournament-game-score';
                        
                        // Get and display scores
                        const scores = game.players.map(p => `${this.getPlayerDisplayName(p)}: ${p.score}`).join(' | ');
                        scoreElement.textContent = scores;
                        
                        gameBox.appendChild(scoreElement);
                    }
                } else {
                    // Upcoming game
                    const upcomingLabel = document.createElement('div');
                    upcomingLabel.className = 'tournament-game-upcoming';
                    upcomingLabel.textContent = 'Upcoming Match';
                    gameBox.appendChild(upcomingLabel);
                }
            } else {
                // No game data yet
                const pendingLabel = document.createElement('div');
                pendingLabel.className = 'tournament-game-pending';
                pendingLabel.textContent = 'Pending Match';
                gameBox.appendChild(pendingLabel);
            }
            
            roundColumn.appendChild(gameBox);
        });
        
        bracketStructure.appendChild(roundColumn);
    });
    
    bracketDisplay.appendChild(bracketStructure);
    bracketContainer.appendChild(bracketDisplay);
    this.container.appendChild(bracketContainer);
    
    // Add connecting lines between rounds
    this.drawBracketConnectors();
}

// findGameById(gameId) {
//     // This method would need to be implemented to find a game by ID
//     // For now, we'll return null, but ideally this would look up the game data
//     // from your application state or make an API request
//     const rsp = ;
//     return rsp
//     return null;
// }

drawBracketConnectors() {
    // Add SVG overlays for bracket connectors
    setTimeout(() => {
        const bracket = document.querySelector('.tournament-bracket-structure');
        if (!bracket) return;
        
        const rounds = bracket.querySelectorAll('.tournament-round');
        if (rounds.length <= 1) return;
        
        // Create SVG overlay
        const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgOverlay.classList.add('tournament-connectors');
        svgOverlay.style.position = 'absolute';
        svgOverlay.style.top = '0';
        svgOverlay.style.left = '0';
        svgOverlay.style.width = '100%';
        svgOverlay.style.height = '100%';
        svgOverlay.style.pointerEvents = 'none';
        bracket.style.position = 'relative';
        
        // For each round except the final, connect games to the next round
        for (let i = 0; i < rounds.length - 1; i++) {
            const currentRound = rounds[i];
            const nextRound = rounds[i + 1];
            
            const currentGames = currentRound.querySelectorAll('.tournament-game');
            const nextGames = nextRound.querySelectorAll('.tournament-game');
            
            // Each pair of games in current round connects to one game in next round
            for (let j = 0; j < nextGames.length; j++) {
                const nextGame = nextGames[j];
                const nextGameRect = nextGame.getBoundingClientRect();
                const nextGameMiddleY = nextGameRect.top + (nextGameRect.height / 2);
                
                // Find the two games that feed into this next game
                const currentGame1 = currentGames[j * 2];
                const currentGame2 = currentGames[j * 2 + 1];
                
                if (currentGame1) {
                    const game1Rect = currentGame1.getBoundingClientRect();
                    const game1MiddleY = game1Rect.top + (game1Rect.height / 2);
                    
                    // Draw connector from game1 to next game
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${game1Rect.right} ${game1MiddleY} H ${(game1Rect.right + nextGameRect.left) / 2} V ${nextGameMiddleY} H ${nextGameRect.left}`);
                    path.setAttribute('stroke', 'rgba(0, 255, 255, 0.7)');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    svgOverlay.appendChild(path);
                }
                
                if (currentGame2) {
                    const game2Rect = currentGame2.getBoundingClientRect();
                    const game2MiddleY = game2Rect.top + (game2Rect.height / 2);
                    
                    // Draw connector from game2 to next game
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${game2Rect.right} ${game2MiddleY} H ${(game2Rect.right + nextGameRect.left) / 2} V ${nextGameMiddleY} H ${nextGameRect.left}`);
                    path.setAttribute('stroke', 'rgba(0, 255, 255, 0.7)');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('fill', 'none');
                    svgOverlay.appendChild(path);
                }
            }
        }
        
        bracket.appendChild(svgOverlay);
    }, 200); // Small delay to ensure DOM elements are positioned
    }
}