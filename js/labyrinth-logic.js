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
        
        // 固定颜色
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
        
        // 更严格的短死路检测：如果只有1个或0个潜在出口，认为是短死路
        if (potentialExits <= 1) return true;
        
        // 额外检查：如果周围2格范围内已有太多死路，也认为会创建细碎结构
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
        
        return nearbyDeadEnds >= 2; // 如果附近已有2个或更多死路，避免创建新的
    }
    
    // 计算到最近分叉点的距离，用于惩罚极短通道
    getDistanceToNearestJunction(startX, startY, excludeDir) {
        let minDistance = Infinity;
        
        // 从当前位置向各个方向搜索，找到最近的分叉点
        for (let searchDir = 0; searchDir < 4; searchDir++) {
            if (searchDir === excludeDir) continue; // 排除即将要走的方向
            
            let distance = 0;
            let currentX = startX;
            let currentY = startY;
            let currentDir = searchDir;
            
            // 沿着这个方向搜索，直到找到分叉点或死路
            while (distance < 10) { // 限制搜索距离
                const nextX = currentX + this.DIRECTIONS[currentDir].dx;
                const nextY = currentY + this.DIRECTIONS[currentDir].dy;
                
                if (!this.isCellCarved(nextX, nextY)) break; // 遇到墙壁
                if (!this.isEdgeOpenCached(currentX, currentY, currentDir)) break; // 路径不通
                
                currentX = nextX;
                currentY = nextY;
                distance++;
                
                // 检查当前位置是否是分叉点（有超过2个开口）
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
                
                // 如果是直线通道，继续沿着同一方向
                if (openDirs === 2) {
                    // 找到下一个方向（不是来的方向）
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
                    break; // 死路或其他情况
                }
            }
        }
        
        return minDistance === Infinity ? 10 : minDistance; // 如果没找到分叉点，返回较大值
    }
    
    // 检测相邻死路的开口方向，防止形成M、E、W型结构
    detectAdjacentDeadEndPattern(nx, ny, fromX, fromY, proposedDir) {
        // 检查相邻位置是否存在相同开口方向的死路
        const adjacentPositions = [
            { x: nx - 1, y: ny }, // 左
            { x: nx + 1, y: ny }, // 右
            { x: nx, y: ny - 1 }, // 上
            { x: nx, y: ny + 1 }  // 下
        ];
        
        for (const pos of adjacentPositions) {
            if (pos.x === fromX && pos.y === fromY) continue;
            if (!this.isCellCarved(pos.x, pos.y)) continue;
            
            // 检查这个相邻位置是否是死路
            let openDirs = [];
            for (let i = 0; i < 4; i++) {
                if (this.isEdgeOpenCached(pos.x, pos.y, i)) {
                    openDirs.push(i);
                }
            }
            
            // 如果是死路（只有一个开口）
            if (openDirs.length === 1) {
                const existingDeadEndDir = openDirs[0];
                // 如果新的死路开口方向与现有死路相同，返回惩罚
                if (existingDeadEndDir === proposedDir) {
                    return 0.01; // 重度惩罚
                }
                // 如果是相对方向（形成直线型死路），也给予惩罚
                if (Math.abs(existingDeadEndDir - proposedDir) === 2) {
                    return 0.05; // 中度惩罚
                }
            }
        }
        
        return 1.0; // 无惩罚
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
                    
                    // 额外惩罚：检查是否会创建极短的通道段
                    // 如果当前位置到最近的分叉点距离太短，给予惩罚
                    let distanceToJunction = this.getDistanceToNearestJunction(current.x, current.y, i);
                    if (distanceToJunction < 3) {
                        score *= 0.4; // 对极短通道给予重度惩罚
                    } else if (distanceToJunction < 5) {
                        score *= 0.7; // 对较短通道给予中度惩罚
                    }
                    
                    if (this.wouldCreateShortDeadEnd(nx, ny, current.x, current.y)) {
                        score *= 0.05;
                        
                        // 检查相邻死路模式，防止形成M、E、W型结构
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
            
            // 强制扩展死路至少2-3个单元格
            let currentX = x, currentY = y;
            let currentDir = bestDir;
            let extensionLength = 0;
            const minExtensionLength = 2 + Math.floor(this.randHash(x, y, 888) * 2); // 2-3个单元格
            
            for (let step = 0; step < minExtensionLength; step++) {
                const nextX = currentX + this.DIRECTIONS[currentDir].dx;
                const nextY = currentY + this.DIRECTIONS[currentDir].dy;
                
                if (this.isCellCarved(nextX, nextY)) break; // 如果已经雕刻，停止扩展
                
                // 检查是否会创建过多连接
                let carvedNeighbors = 0;
                for (let k = 0; k < 4; k++) {
                    const checkX = nextX + this.DIRECTIONS[k].dx;
                    const checkY = nextY + this.DIRECTIONS[k].dy;
                    if (this.isCellCarved(checkX, checkY) && !(checkX === currentX && checkY === currentY)) {
                        carvedNeighbors++;
                    }
                }
                
                if (carvedNeighbors > 1) break; // 避免创建过多连接
                
                this.carveCell(nextX, nextY);
                this.setEdgeState(currentX, currentY, currentDir, true);
                extendedCount++;
                extensionLength++;
                
                // 准备下一步：有70%概率继续直行，30%概率转向
                const continueHash = this.randHash(nextX, nextY, 999 + step);
                if (continueHash < 0.7) {
                    // 继续直行
                    currentX = nextX;
                    currentY = nextY;
                } else {
                    // 尝试转向
                    const possibleTurns = [];
                    for (let k = 0; k < 4; k++) {
                        if (k === currentDir || k === (currentDir + 2) % 4) continue; // 排除直行和回头
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
                        break; // 无法转向，结束扩展
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
