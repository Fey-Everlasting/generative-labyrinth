/**
 * The Infinite Structure - Labyrinth Logic
 * A recursive, self-generating labyrinth that builds itself endlessly from within
 */
export class LabyrinthLogic {
    constructor(seed) {
        this.SEED = seed;
        this.CELL_SIZE = 20;
        this.EXPLORER_SPEED = 12.0;
        
        this.edgeCache = new Map();
        this.cellStateCache = new Map();
        this.visitedSet = new Set();
        this.ART_PARAMS = {};
        
        this.VISIBLE_CELLS_COUNT = 31;
        
        // Observer remains fixed at world coordinates (0, 0)
        this.OBSERVER_X = 0;
        this.OBSERVER_Y = 0;
        
        // Labyrinth "viewport" offset - the structure moves, not the observer
        this.viewportOffset = {
            cellX: 0,
            cellY: 0,
            pixelX: 0,
            pixelY: 0,
            targetCellX: 0,
            targetCellY: 0,
            isMoving: false,
            path: []
        };
        
        this.DIRECTIONS = [
            { dir: 0, dx: 0, dy: -1 },
            { dir: 1, dx: 1, dy: 0 },
            { dir: 2, dx: 0, dy: 1 },
            { dir: 3, dx: -1, dy: 0 }
        ];
        
        this.generateArtisticParameters();
        
        // console.log('✅ LabyrinthLogic initialized - The Infinite Structure, seed:', seed);
    }
    
    randHash(x, y, d = 0) {
        if (x === 0 && y === 0 && d === 0) {
            x = this.SEED; y = this.SEED; d = 10101;
        }
        
        let h = this.SEED ^ (x * 73856093) ^ (y * 19349663) ^ (d * 83492791);
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489917);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    
    getKey(x, y) {
        return `${x},${y}`;
    }
    
    getOppositeDir(dirIndex) {
        return (dirIndex + 2) % 4;
    }
    
    mapRange(hash, min, max) {
        return min + hash * (max - min);
    }
    
    generateArtisticParameters() {
        this.ART_PARAMS.tunnelPreference = this.mapRange(this.randHash(0, 0, 1), 0.4, 0.8);
        this.ART_PARAMS.sparsityPenalty = this.mapRange(this.randHash(0, 0, 2), 0.05, 0.2);
        
        // Fixed color
        this.ART_PARAMS.wallHue = 210;
        this.ART_PARAMS.visitedAlpha = 0.2;
        this.ART_PARAMS.explorerHue = 15;
        
        this.ART_PARAMS.turnPreferenceBoost = this.mapRange(this.randHash(0, 0, 6), 1.8, 2.8);
        this.ART_PARAMS.straightPreferenceBoost = this.mapRange(this.randHash(0, 0, 7), 1.2, 1.6);
        this.ART_PARAMS.diversityPenalty = this.mapRange(this.randHash(0, 0, 8), 0.1, 0.4);
    }
    
    isCellCarved(x, y) {
        return this.cellStateCache.get(this.getKey(x, y)) || false;
    }
    
    carveCell(x, y) {
        this.cellStateCache.set(this.getKey(x, y), true);
    }
    
    setEdgeState(x, y, dirIndex, isOpen) {
        const dir = this.DIRECTIONS[dirIndex];
        this.edgeCache.set(`${x},${y},${dirIndex}`, isOpen);
        const nx = x + dir.dx, ny = y + dir.dy;
        this.edgeCache.set(`${nx},${ny},${this.getOppositeDir(dirIndex)}`, isOpen);
    }
    
    isEdgeOpen(x, y, dirIndex) {
        const cacheKey = `${x},${y},${dirIndex}`;
        if (this.edgeCache.has(cacheKey)) return this.edgeCache.get(cacheKey);
        if (!this.isCellCarved(x, y)) this.generateLabyrinthStructure(x, y);
        else return false;
        return this.edgeCache.get(cacheKey) || false;
    }
    
    isPathOpen(x, y, dx, dy) {
        if (dx === 0 && dy === -1) return this.isEdgeOpen(x, y, 0);
        if (dx === 1 && dy === 0) return this.isEdgeOpen(x, y, 1);
        if (dx === 0 && dy === 1) return this.isEdgeOpen(x, y, 2);
        if (dx === -1 && dy === 0) return this.isEdgeOpen(x, y, 3);
        return false;
    }
    
    isEdgeOpenCached(x, y, dirIndex) {
        const cacheKey = `${x},${y},${dirIndex}`;
        return this.edgeCache.has(cacheKey) ? this.edgeCache.get(cacheKey) : false;
    }
    
    detectParallelCorridor(fromX, fromY, dirIndex, toX, toY) {
        const perpDir1 = (dirIndex + 1) % 4;
        const perpDir2 = (dirIndex + 3) % 4;
        let parallelCount = 0;
        
        for (const perpDir of [perpDir1, perpDir2]) {
            const sideX = fromX + this.DIRECTIONS[perpDir].dx;
            const sideY = fromY + this.DIRECTIONS[perpDir].dy;
            
            if (this.isCellCarved(sideX, sideY) && this.isEdgeOpenCached(sideX, sideY, dirIndex)) {
                parallelCount++;
                
                const ahead1X = toX + this.DIRECTIONS[dirIndex].dx;
                const ahead1Y = toY + this.DIRECTIONS[dirIndex].dy;
                const sideAhead1X = sideX + this.DIRECTIONS[dirIndex].dx;
                const sideAhead1Y = sideY + this.DIRECTIONS[dirIndex].dy;
                
                if (this.isCellCarved(ahead1X, ahead1Y) && 
                    this.isCellCarved(sideAhead1X, sideAhead1Y) &&
                    this.isEdgeOpenCached(sideX, sideY, dirIndex) &&
                    this.isEdgeOpenCached(sideAhead1X, sideAhead1Y, dirIndex)) {
                    parallelCount += 3;
                }
                
                const ahead2X = ahead1X + this.DIRECTIONS[dirIndex].dx;
                const ahead2Y = ahead1Y + this.DIRECTIONS[dirIndex].dy;
                if (this.isCellCarved(ahead2X, ahead2Y) && this.isEdgeOpenCached(ahead1X, ahead1Y, dirIndex)) {
                    parallelCount += 2;
                }
            }
        }
        
        if (parallelCount === 0) return 1.0;
        if (parallelCount === 1) return 0.15;
        if (parallelCount === 2) return 0.05;
        if (parallelCount >= 3) return 0.01;
        return 0.005;
    }
    
    calculateDirectionBalance(centerX, centerY, proposedDir) {
        const checkRadius = 3;
        let horizontalCount = 0;
        let verticalCount = 0;
        
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (this.isCellCarved(x, y)) {
                    if (this.isEdgeOpenCached(x, y, 1) || this.isEdgeOpenCached(x, y, 3)) horizontalCount++;
                    if (this.isEdgeOpenCached(x, y, 0) || this.isEdgeOpenCached(x, y, 2)) verticalCount++;
                }
            }
        }
        
        const total = horizontalCount + verticalCount;
        if (total === 0) return 1.0;
        
        const hRatio = horizontalCount / total;
        const vRatio = verticalCount / total;
        
        if (proposedDir === 1 || proposedDir === 3) {
            if (hRatio > 0.6) return 0.3;
            if (hRatio > 0.55) return 0.6;
            if (hRatio < 0.4) return 1.5;
            return 1.0;
        } else {
            if (vRatio > 0.6) return 0.3;
            if (vRatio > 0.55) return 0.6;
            if (vRatio < 0.4) return 1.5;
            return 1.0;
        }
    }
    
    wouldCreateShortDeadEnd(nx, ny, fromX, fromY) {
        let potentialExits = 0;
        for (let i = 0; i < 4; i++) {
            const dir = this.DIRECTIONS[i];
            const checkX = nx + dir.dx;
            const checkY = ny + dir.dy;
            if (checkX === fromX && checkY === fromY) continue;
            if (!this.isCellCarved(checkX, checkY)) {
                potentialExits++;
            }
        }
        
        // Stricter short dead-end detection: consider it a short dead-end if there are only 1 or 0 potential exits
        if (potentialExits <= 1) return true;
        
        // Additional check: if there are too many dead-ends within a 2-cell range, also consider it creating fragmented structure
        let nearbyDeadEnds = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                const checkX = nx + dx;
                const checkY = ny + dy;
                if (this.isCellCarved(checkX, checkY)) {
                    let openDirs = 0;
                    for (let k = 0; k < 4; k++) {
                        if (this.isEdgeOpenCached(checkX, checkY, k)) {
                            openDirs++;
                        }
                    }
                    if (openDirs === 1) nearbyDeadEnds++;
                }
            }
        }
        
        return nearbyDeadEnds >= 2; // If there are already 2 or more dead-ends nearby, avoid creating new ones
    }
    
    // Calculate distance to nearest junction, used to penalize extremely short passages
    getDistanceToNearestJunction(startX, startY, excludeDir) {
        let minDistance = Infinity;
        
        // Search from current position in all directions to find the nearest junction
        for (let searchDir = 0; searchDir < 4; searchDir++) {
            if (searchDir === excludeDir) continue; // Exclude the direction about to be taken
            
            let distance = 0;
            let currentX = startX;
            let currentY = startY;
            let currentDir = searchDir;
            
            // Search along this direction until finding a junction or dead-end
            while (distance < 10) { // Limit search distance
                const nextX = currentX + this.DIRECTIONS[currentDir].dx;
                const nextY = currentY + this.DIRECTIONS[currentDir].dy;
                
                if (!this.isCellCarved(nextX, nextY)) break; // Hit a wall
                if (!this.isEdgeOpenCached(currentX, currentY, currentDir)) break; // Path is blocked
                
                currentX = nextX;
                currentY = nextY;
                distance++;
                
                // Check if current position is a junction (has more than 2 openings)
                let openDirs = 0;
                for (let k = 0; k < 4; k++) {
                    if (this.isEdgeOpenCached(currentX, currentY, k)) {
                        openDirs++;
                    }
                }
                
                if (openDirs > 2) {
                    minDistance = Math.min(minDistance, distance);
                    break;
                }
                
                // If it's a straight corridor, continue in the same direction
                if (openDirs === 2) {
                    // Find the next direction (not the direction we came from)
                    let nextDir = -1;
                    for (let k = 0; k < 4; k++) {
                        if (k !== (currentDir + 2) % 4 && this.isEdgeOpenCached(currentX, currentY, k)) {
                            nextDir = k;
                            break;
                        }
                    }
                    if (nextDir === -1) break;
                    currentDir = nextDir;
                } else {
                    break; // Dead-end or other situation
                }
            }
        }
        
        return minDistance === Infinity ? 10 : minDistance; // If no junction found, return a larger value
    }
    
    // Detect adjacent dead-ends pattern, prevent forming M, E, W-type structures
    detectAdjacentDeadEndPattern(nx, ny, fromX, fromY, proposedDir) {
        // Check if adjacent positions have dead-ends with the same opening direction
        const adjacentPositions = [
            { x: nx - 1, y: ny }, // Left
            { x: nx + 1, y: ny }, // Right
            { x: nx, y: ny - 1 }, // Up
            { x: nx, y: ny + 1 }  // Down
        ];
        
        for (const pos of adjacentPositions) {
            if (pos.x === fromX && pos.y === fromY) continue;
            if (!this.isCellCarved(pos.x, pos.y)) continue;
            
            // Check if this adjacent position is a dead-end
            let openDirs = [];
            for (let i = 0; i < 4; i++) {
                if (this.isEdgeOpenCached(pos.x, pos.y, i)) {
                    openDirs.push(i);
                }
            }
            
            // If it's a dead-end (only one opening)
            if (openDirs.length === 1) {
                const existingDeadEndDir = openDirs[0];
                // If the new dead-end opening direction is the same as existing dead-end, return penalty
                if (existingDeadEndDir === proposedDir) {
                    return 0.01; // Heavy penalty
                }
                // If it's opposite direction (forming linear dead-ends), also give penalty
                if (Math.abs(existingDeadEndDir - proposedDir) === 2) {
                    return 0.05; // Medium penalty
                }
            }
        }
        
        return 1.0; // No penalty
    }
    
    generateLabyrinthStructure(startX, startY) {
        if (this.isCellCarved(startX, startY)) return;
        
        const carvedThisRound = new Set();
        
        this.carveCell(startX, startY);
        carvedThisRound.add(this.getKey(startX, startY));
        
        let bestHash = -Infinity, bestDirIndex = -1;
        for (let i = 0; i < 4; i++) {
            const dir = this.DIRECTIONS[i];
            const nx = startX + dir.dx, ny = startY + dir.dy;
            if (this.isCellCarved(nx, ny)) {
                const connectionHash = this.randHash(startX, startY, 1000 + i * 123);
                if (connectionHash > bestHash) {
                    bestHash = connectionHash;
                    bestDirIndex = i;
                }
            }
        }
        if (bestDirIndex !== -1) this.setEdgeState(startX, startY, bestDirIndex, true);
        
        const activeCells = [{ x: startX, y: startY, lastDir: -1 }];
        let maxIterations = this.VISIBLE_CELLS_COUNT * this.VISIBLE_CELLS_COUNT * 2;
        let iterations = 0;
        
        while (activeCells.length > 0 && iterations < maxIterations) {
            iterations++;
            
            const currentLength = activeCells.length;
            if (currentLength === 0) break;
            
            let cellIndex;
            if (this.randHash(startX, startY, iterations) < this.ART_PARAMS.tunnelPreference) {
                cellIndex = currentLength - 1;
            } else {
                cellIndex = Math.floor(this.randHash(startX, startY, iterations + 1) * currentLength);
            }
            cellIndex = Math.max(0, Math.min(cellIndex, currentLength - 1));
            
            const current = activeCells[cellIndex];
            if (!current || typeof current.x !== 'number') {
                activeCells.splice(cellIndex, 1);
                continue;
            }
            
            const neighborScores = [];
            for (let i = 0; i < 4; i++) {
                const dir = this.DIRECTIONS[i];
                const nx = current.x + dir.dx, ny = current.y + dir.dy;
                
                if (!this.isCellCarved(nx, ny)) {
                    let score = 1.0;
                    
                    if (i === current.lastDir) {
                        score *= this.ART_PARAMS.straightPreferenceBoost;
                    } else if (current.lastDir !== -1) {
                        score *= this.ART_PARAMS.turnPreferenceBoost;
                    }
                    
                    let carvedNeighborsOfNewCell = 0;
                    for (let k = 0; k < 4; k++) {
                        const nextDir = this.DIRECTIONS[k];
                        const nnx = nx + nextDir.dx, nny = ny + nextDir.dy;
                        if (this.isCellCarved(nnx, nny) && (nnx !== current.x || nny !== current.y)) {
                            carvedNeighborsOfNewCell++;
                        }
                    }
                    
                    if (carvedNeighborsOfNewCell >= 3) {
                        score *= this.ART_PARAMS.sparsityPenalty * 0.3;
                    } else if (carvedNeighborsOfNewCell === 2) {
                        score *= this.ART_PARAMS.sparsityPenalty;
                    } else if (carvedNeighborsOfNewCell === 1) {
                        score *= 0.7;
                    }
                    
                    // Additional penalty: check if it would create extremely short passage segments
                    // If the distance from current position to nearest junction is too short, give penalty
                    let distanceToJunction = this.getDistanceToNearestJunction(current.x, current.y, i);
                    if (distanceToJunction < 3) {
                        score *= 0.4; // Heavy penalty for extremely short passages
                    } else if (distanceToJunction < 5) {
                        score *= 0.7; // Medium penalty for shorter passages
                    }
                    
                    if (this.wouldCreateShortDeadEnd(nx, ny, current.x, current.y)) {
                        score *= 0.05;
                        
                        // Check adjacent dead-end patterns to prevent forming M, E, W-type structures
                        const adjacentDeadEndPenalty = this.detectAdjacentDeadEndPattern(nx, ny, current.x, current.y, i);
                        score *= adjacentDeadEndPenalty;
                    }
                    
                    const dirPerp1 = (i + 1) % 4;
                    const dirPerp2 = (i + 3) % 4;
                    const checkX1 = current.x + this.DIRECTIONS[dirPerp1].dx;
                    const checkY1 = current.y + this.DIRECTIONS[dirPerp1].dy;
                    const checkX2 = current.x + this.DIRECTIONS[dirPerp2].dx;
                    const checkY2 = current.y + this.DIRECTIONS[dirPerp2].dy;
                    
                    if (this.isCellCarved(checkX1, checkY1) && this.isEdgeOpenCached(checkX1, checkY1, i)) {
                        score *= this.ART_PARAMS.diversityPenalty * 0.5;
                    }
                    if (this.isCellCarved(checkX2, checkY2) && this.isEdgeOpenCached(checkX2, checkY2, i)) {
                        score *= this.ART_PARAMS.diversityPenalty * 0.5;
                    }
                    
                    const parallelPenalty = this.detectParallelCorridor(current.x, current.y, i, nx, ny);
                    score *= parallelPenalty;
                    
                    const directionBalance = this.calculateDirectionBalance(current.x, current.y, i);
                    score *= directionBalance;
                    
                    score *= this.randHash(nx, ny, iterations + i * 5);
                    neighborScores.push({ x: nx, y: ny, dirIndex: i, score: score });
                }
            }
            
            if (neighborScores.length > 0) {
                neighborScores.sort((a, b) => b.score - a.score);
                const nextNeighbor = neighborScores[0];
                this.carveCell(nextNeighbor.x, nextNeighbor.y);
                carvedThisRound.add(this.getKey(nextNeighbor.x, nextNeighbor.y));
                this.setEdgeState(current.x, current.y, nextNeighbor.dirIndex, true);
                activeCells.push({ x: nextNeighbor.x, y: nextNeighbor.y, lastDir: nextNeighbor.dirIndex });
            } else {
                activeCells.splice(cellIndex, 1);
            }
        }
        
        this.ensureSmartBreathingHoles(startX, startY);
        this.softExtendShortDeadEnds(carvedThisRound);
    }
    
    ensureSmartBreathingHoles(centerX, centerY) {
        const range = Math.floor(this.VISIBLE_CELLS_COUNT / 2);
        let holesOpened = 0;
        
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const x = centerX + dx, y = centerY + dy;
                if (this.isCellCarved(x, y)) continue;
                
                const carvedNeighbors = [];
                for (let i = 0; i < 4; i++) {
                    const dir = this.DIRECTIONS[i];
                    const nx = x + dir.dx, ny = y + dir.dy;
                    if (this.isCellCarved(nx, ny)) {
                        carvedNeighbors.push(i);
                    }
                }
                
                if (carvedNeighbors.length === 4) {
                    let bestDir = carvedNeighbors[0];
                    let bestParallelScore = -1;
                    
                    for (const dirIndex of carvedNeighbors) {
                        const toX = x + this.DIRECTIONS[dirIndex].dx;
                        const toY = y + this.DIRECTIONS[dirIndex].dy;
                        const parallelScore = this.detectParallelCorridor(x, y, dirIndex, toX, toY);
                        
                        if (parallelScore > bestParallelScore) {
                            bestParallelScore = parallelScore;
                            bestDir = dirIndex;
                        }
                    }
                    
                    this.setEdgeState(x, y, bestDir, true);
                    this.carveCell(x, y);
                    holesOpened++;
                }
            }
        }
        
        if (holesOpened > 0) {
            // console.log(`🧠 Smart breathing holes: ${holesOpened} @ (${centerX}, ${centerY})`);
        }
    }
    
    softExtendShortDeadEnds(carvedSet) {
        let extendedCount = 0;
        const originalCells = Array.from(carvedSet);
        
        for (const key of originalCells) {
            const [x, y] = key.split(',').map(Number);
            
            const openDirs = [];
            const uncarvedNeighbors = [];
            for (let i = 0; i < 4; i++) {
                if (this.isEdgeOpenCached(x, y, i)) {
                    openDirs.push(i);
                } else {
                    const nx = x + this.DIRECTIONS[i].dx;
                    const ny = y + this.DIRECTIONS[i].dy;
                    if (!this.isCellCarved(nx, ny)) {
                        uncarvedNeighbors.push(i);
                    }
                }
            }
            
            if (openDirs.length !== 1) continue;
            if (uncarvedNeighbors.length === 0) continue;
            
            let bestDir = uncarvedNeighbors[0];
            let bestScore = -1;
            for (const dirIndex of uncarvedNeighbors) {
                const score = this.detectParallelCorridor(
                    x, y, dirIndex,
                    x + this.DIRECTIONS[dirIndex].dx,
                    y + this.DIRECTIONS[dirIndex].dy
                );
                if (score > bestScore) {
                    bestScore = score;
                    bestDir = dirIndex;
                }
            }
            
            // Force extend dead-ends to at least 2-3 cells
            let currentX = x, currentY = y;
            let currentDir = bestDir;
            let extensionLength = 0;
            const minExtensionLength = 2 + Math.floor(this.randHash(x, y, 888) * 2); // 2-3 cells
            
            for (let step = 0; step < minExtensionLength; step++) {
                const nextX = currentX + this.DIRECTIONS[currentDir].dx;
                const nextY = currentY + this.DIRECTIONS[currentDir].dy;
                
                if (this.isCellCarved(nextX, nextY)) break; // If already carved, stop extension
                
                // Check if it would create too many connections
                let carvedNeighbors = 0;
                for (let k = 0; k < 4; k++) {
                    const checkX = nextX + this.DIRECTIONS[k].dx;
                    const checkY = nextY + this.DIRECTIONS[k].dy;
                    if (this.isCellCarved(checkX, checkY) && !(checkX === currentX && checkY === currentY)) {
                        carvedNeighbors++;
                    }
                }
                
                if (carvedNeighbors > 1) break; // Avoid creating too many connections
                
                this.carveCell(nextX, nextY);
                this.setEdgeState(currentX, currentY, currentDir, true);
                extendedCount++;
                extensionLength++;
                
                // Prepare next step: 70% chance to continue straight, 30% chance to turn
                const continueHash = this.randHash(nextX, nextY, 999 + step);
                if (continueHash < 0.7) {
                    // Continue straight
                    currentX = nextX;
                    currentY = nextY;
                } else {
                    // Try to turn
                    const possibleTurns = [];
                    for (let k = 0; k < 4; k++) {
                        if (k === currentDir || k === (currentDir + 2) % 4) continue; // Exclude straight and backward
                        const turnX = nextX + this.DIRECTIONS[k].dx;
                        const turnY = nextY + this.DIRECTIONS[k].dy;
                        if (!this.isCellCarved(turnX, turnY)) {
                            possibleTurns.push(k);
                        }
                    }
                    
                    if (possibleTurns.length > 0) {
                        currentDir = possibleTurns[Math.floor(this.randHash(nextX, nextY, 1111 + step) * possibleTurns.length)];
                        currentX = nextX;
                        currentY = nextY;
                    } else {
                        break; // Cannot turn, end extension
                    }
                }
            }
        }
        
        if (extendedCount > 0) {
            // console.log(`🔧 Enhanced extension of short dead ends: ${extendedCount} cells`);
        }
    }
    
    getCurrentWorldPos() {
        return {
            x: this.OBSERVER_X + this.viewportOffset.cellX,
            y: this.OBSERVER_Y + this.viewportOffset.cellY
        };
    }
    
    findNextViewportMove() {
        if (this.viewportOffset.isMoving) return;
        
        const currentPos = this.getCurrentWorldPos();
        const startKey = this.getKey(currentPos.x, currentPos.y);
        const q = [{ x: currentPos.x, y: currentPos.y, path: [] }];
        const visitedInSearch = new Set([startKey]);
        const searchLimit = 500;
        
        while (q.length > 0 && visitedInSearch.size < searchLimit) {
            const current = q.shift();
            for (let i = 0; i < 4; i++) {
                const dir = this.DIRECTIONS[i];
                const nx = current.x + dir.dx, ny = current.y + dir.dy;
                const nextKey = this.getKey(nx, ny);
                const isWallOpen = this.isPathOpen(current.x, current.y, dir.dx, dir.dy);
                
                if (isWallOpen && !visitedInSearch.has(nextKey)) {
                    visitedInSearch.add(nextKey);
                    if (!this.visitedSet.has(nextKey)) {
                        this.viewportOffset.path = [...current.path, { x: nx, y: ny }];
                        this.viewportOffset.isMoving = true;
                        return;
                    }
                    q.push({ x: nx, y: ny, path: [...current.path, { x: nx, y: ny }] });
                }
            }
        }
        
        const possibleMoves = [];
        for (let i = 0; i < 4; i++) {
            const d = this.DIRECTIONS[i];
            if (this.isPathOpen(currentPos.x, currentPos.y, d.dx, d.dy)) {
                possibleMoves.push({x: currentPos.x + d.dx, y: currentPos.y + d.dy});
            }
        }
        
        if (possibleMoves.length > 0) {
            const next = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            this.viewportOffset.path = [next];
            this.viewportOffset.isMoving = true;
        }
    }
    
    updateViewport(deltaTime) {
        const currentPos = this.getCurrentWorldPos();
        this.visitedSet.add(this.getKey(currentPos.x, currentPos.y));
        
        if (!this.viewportOffset.isMoving) {
            this.findNextViewportMove();
            return;
        }
        
        if (this.viewportOffset.path.length === 0) {
            this.viewportOffset.isMoving = false;
            this.viewportOffset.pixelX = 0;
            this.viewportOffset.pixelY = 0;
            this.findNextViewportMove();
            return;
        }
        
        const nextCell = this.viewportOffset.path[0];
        const currentWorldPos = this.getCurrentWorldPos();
        const dx = nextCell.x - currentWorldPos.x;
        const dy = nextCell.y - currentWorldPos.y;
        const moveStep = this.EXPLORER_SPEED * deltaTime;
        
        if (dx !== 0) {
            const sign = Math.sign(dx);
            this.viewportOffset.pixelX += sign * moveStep;
            if (Math.abs(this.viewportOffset.pixelX) >= 1) {
                this.viewportOffset.cellX += sign;
                this.viewportOffset.pixelX = 0;
                this.viewportOffset.path.shift();
            }
        } else if (dy !== 0) {
            const sign = Math.sign(dy);
            this.viewportOffset.pixelY += sign * moveStep;
            if (Math.abs(this.viewportOffset.pixelY) >= 1) {
                this.viewportOffset.cellY += sign;
                this.viewportOffset.pixelY = 0;
                this.viewportOffset.path.shift();
            }
        }
    }
    
    update(deltaTime) {
        this.updateViewport(deltaTime);
    }
}
