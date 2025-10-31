/**
 * The Infinite Structure - WebGL Renderer
 * Renders the self-generating labyrinth with dynamic visual effects
 */
export class LabyrinthRendererWebGL {
    constructor(canvas, labyrinthLogic) {
        this.canvas = canvas;
        this.labyrinth = labyrinthLogic;
        
        // Initialize WebGL
        this.gl = canvas.getContext('webgl2', {
            antialias: true,
            alpha: false,
            premultipliedAlpha: false
        });
        
        if (!this.gl) {
            throw new Error('WebGL 2.0 not supported');
        }
        
        this.time = 0;
        this.lastViewportState = null; // Track viewport changes
        this.initShader();
        this.initGeometry();
        this.setupLabyrinthTexture();
        
        // console.log('✨ WebGL renderer initialized - The Infinite Structure');
    }
    
    initShader() {
        const gl = this.gl;
        
        // Vertex shader
        const vertexSource = `#version 300 es
            in vec2 position;
            in vec2 texCoord;
            out vec2 vTexCoord;
            
            void main() {
                vTexCoord = texCoord;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader - brand new dynamic effects
        const fragmentSource = `#version 300 es
            precision highp float;
            
            in vec2 vTexCoord;
            out vec4 fragColor;
            
            uniform sampler2D uLabyrinthTexture;
            uniform float uTime;
            uniform vec2 uResolution;
            
            // Simple noise function
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            // Smooth noise
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = noise(i);
                float b = noise(i + vec2(1.0, 0.0));
                float c = noise(i + vec2(0.0, 1.0));
                float d = noise(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            // Ripple effect
            float ripple(vec2 uv, vec2 center, float time) {
                float dist = length(uv - center);
                return sin(dist * 15.0 - time * 3.0) * exp(-dist * 2.0) * 0.3;
            }
            
            // Breathing glow - softer effect
            float breathingGlow(float time) {
                return 0.9 + 0.1 * sin(time * 1.2);
            }
            
            // Flow effect
            vec2 flowDistortion(vec2 uv, float time) {
                float flow = smoothNoise(uv * 3.0 + vec2(time * 0.5, 0.0)) * 0.02;
                return uv + vec2(flow, flow * 0.5);
            }
            
            void main() {
                vec2 uv = vTexCoord;
                vec4 labyrinthColor = texture(uLabyrinthTexture, uv);
                
                // More refined TRAE-style background effect
                vec2 fineGridUV = uv * 120.0; // Finer grid
                vec2 fineGridID = floor(fineGridUV);
                
                // Static noise effect, avoiding hard boundaries
                float fineNoise = smoothNoise(fineGridID * 0.1);
                float subtlePattern = fineNoise * 0.01; // Very subtle static effect
                
                // Static subtle texture effect
                float gentleFlow = sin(uv.x * 10.0) * sin(uv.y * 8.0) * 0.005;
                
                if (labyrinthColor.r > 0.3 && labyrinthColor.g < 0.3) {
                    // Walls - moderate green, ensuring visibility
                    vec3 baseColor = vec3(0.0, 0.5, 0.2); // Slightly increase brightness to ensure walls are visible
                    
                    // Radial breathing glow effect - spreading from center
                    vec2 center = vec2(0.5, 0.5);
                    float distFromCenter = length(uv - center);
                    
                    // Breathing effect - time-based pulse
                    float breathPulse = 0.7 + 0.3 * sin(uTime * 1.5);
                    
                    // Radial glow - spreading outward from center
                    float radialGlow = 1.0 - smoothstep(0.0, 0.8, distFromCenter);
                    radialGlow = pow(radialGlow, 2.0) * breathPulse;
                    
                    // Edge glow - soft green tech feel
                    vec2 pixelSize = 1.0 / uResolution;
                    float edge = 0.0;
                    edge += abs(texture(uLabyrinthTexture, uv + vec2(-pixelSize.x, 0.0)).r - labyrinthColor.r);
                    edge += abs(texture(uLabyrinthTexture, uv + vec2(pixelSize.x, 0.0)).r - labyrinthColor.r);
                    edge += abs(texture(uLabyrinthTexture, uv + vec2(0.0, -pixelSize.y)).r - labyrinthColor.r);
                    edge += abs(texture(uLabyrinthTexture, uv + vec2(0.0, pixelSize.y)).r - labyrinthColor.r);
                    
                    vec3 edgeGlow = vec3(0.0, 0.6, 0.3) * smoothstep(0.0, 1.0, edge) * 0.3;
                    
                    // Subtle vertical gradient effect - very slight, doesn't affect visibility
                    float subtleVerticalGradient = 0.8 + 0.2 * (1.0 - uv.y * 0.3);
                    
                    // Apply radial breathing glow effect and subtle vertical gradient
                    vec3 glowColor = vec3(0.0, 0.8, 0.4) * radialGlow * 0.4;
                    vec3 finalColor = (baseColor + glowColor + edgeGlow) * subtleVerticalGradient;
                    fragColor = vec4(finalColor, 1.0);
                    
                } else if (labyrinthColor.g > 0.3 && labyrinthColor.r < 0.3) {
                    // Explorer - stable bright green, no color change
                    vec3 baseColor = vec3(0.2, 1.0, 0.6); // Stable bright green
                    
                    // Simple brightness pulse, no color change
                    float pulse = 0.9 + 0.1 * sin(uTime * 3.0);
                    
                    // Remove complex rotation and radial effects, keep color stable
                    vec3 finalColor = baseColor * pulse;
                    fragColor = vec4(finalColor, 1.0);
                    
                } else if (labyrinthColor.b > 0.2 && labyrinthColor.r < 0.3 && labyrinthColor.g < 0.3) {
                    // Access trace - dark green trace
                    vec3 traceColor = vec3(0.0, 0.3, 0.15);
                    float traceFade = 0.4 + 0.1 * sin(uTime * 1.5);
                    fragColor = vec4(traceColor * traceFade, 0.6);
                    
                } else {
                    // Background - refined TRAE-style dark background
                    vec3 baseColor = vec3(0.02, 0.05, 0.03); // Very deep green tone
                    
                    // Refined background texture effect
                    float backgroundTexture = subtlePattern + gentleFlow;
                    
                    // Radial gradient, slightly brighter at center
                    float radialGrad = 1.0 - length(uv - vec2(0.5)) * 0.3;
                    
                    // Static color shift
                    vec3 colorShift = vec3(
                        0.0,
                        0.002,
                        0.001
                    );
                    
                    // Add very subtle scanline effect
                    float scanlines = sin(uv.y * 800.0) * 0.003;
                    
                    vec3 finalColor = (baseColor + colorShift + vec3(0.0, backgroundTexture, backgroundTexture * 0.5) + vec3(0.0, scanlines, scanlines * 0.5)) * radialGrad;
                    fragColor = vec4(finalColor, 1.0);
                }
            }
        `;
        
        // console.log('🔧 Compiling shader...');
        
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            throw new Error('Shader program link failed');
        }
        
        // console.log('✅ Shader compilation successful');
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const errorLog = gl.getShaderInfoLog(shader);
            console.error('Shader compile error:', errorLog);
            console.error('Shader source:', source);
            gl.deleteShader(shader);
            throw new Error('Shader compilation failed: ' + errorLog);
        }
        
        return shader;
    }
    
    initGeometry() {
        const gl = this.gl;
        
        // Fullscreen quad
        const vertices = new Float32Array([
            -1, -1,  0, 0,
             1, -1,  1, 0,
            -1,  1,  0, 1,
             1,  1,  1, 1
        ]);
        
        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }
    
    setupLabyrinthTexture() {
        const gl = this.gl;
        this.labyrinthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.labyrinthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Create temporary canvas for 2D rendering
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
        this.setupLabyrinthTexture();
    }
    
    renderLabyrinthToTexture() {
        const gl = this.gl;
        const labyrinth = this.labyrinth;
        
        // Only resize temporary canvas when needed
        if (this.tempCanvas.width !== this.canvas.width || this.tempCanvas.height !== this.canvas.height) {
            this.tempCanvas.width = this.canvas.width;
            this.tempCanvas.height = this.canvas.height;
        }
        const ctx = this.tempCtx;
        
        // Render maze to temporary canvas
        this.renderLabyrinthTo2D(ctx);
        
        // Upload to WebGL texture (using subImage2D for performance optimization)
        gl.bindTexture(gl.TEXTURE_2D, this.labyrinthTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.tempCanvas);
    }
    
    renderLabyrinthTo2D(ctx) {
        const labyrinth = this.labyrinth;
        const CELL_SIZE = labyrinth.CELL_SIZE;
        
        // Clear canvas with black background
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const cellsX = Math.floor(this.canvas.width / CELL_SIZE);
        const cellsY = Math.floor(this.canvas.height / CELL_SIZE);
        const halfCellsX = Math.floor(cellsX / 2);
        const halfCellsY = Math.floor(cellsY / 2);
        
        const viewCenterX = labyrinth.OBSERVER_X + labyrinth.viewportOffset.cellX;
        const viewCenterY = labyrinth.OBSERVER_Y + labyrinth.viewportOffset.cellY;
        
        const startGlobalX = viewCenterX - halfCellsX;
        const startGlobalY = viewCenterY - halfCellsY;
        
        // Use more precise sub-pixel offset calculation for smooth movement
        const pixelOffsetX = -labyrinth.viewportOffset.pixelX * CELL_SIZE;
        const pixelOffsetY = -labyrinth.viewportOffset.pixelY * CELL_SIZE;
        
        // Apply sub-pixel anti-aliasing to reduce visual artifacts
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Visited traces are not drawn in 2D rendering stage, already set to transparent in shader
        // This ensures visited cells are completely transparent without any color overlay
        
        // Draw walls (red channel) - increase wall thickness for better visibility
        ctx.strokeStyle = 'rgb(160, 0, 0)'; // Reduced from 220 to 160 for lower contrast
        ctx.lineWidth = 0.6; // Increased from 0.4 to 1.2 for better visibility
        ctx.lineCap = 'square';
        
        for (let j = 0; j < cellsY; j++) {
            for (let i = 0; i < cellsX; i++) {
                const globalX = startGlobalX + i;
                const globalY = startGlobalY + j;
                
                let screenX = i * CELL_SIZE + pixelOffsetX;
                let screenY = j * CELL_SIZE + pixelOffsetY;
                
                // Top wall
                if (!labyrinth.isEdgeOpen(globalX, globalY, 0)) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY);
                    ctx.lineTo(screenX + CELL_SIZE, screenY);
                    ctx.stroke();
                }
                // Right wall
                if (!labyrinth.isEdgeOpen(globalX, globalY, 1)) {
                    ctx.beginPath();
                    ctx.moveTo(screenX + CELL_SIZE, screenY);
                    ctx.lineTo(screenX + CELL_SIZE, screenY + CELL_SIZE);
                    ctx.stroke();
                }
                // Bottom wall
                if (!labyrinth.isEdgeOpen(globalX, globalY, 2)) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY + CELL_SIZE);
                    ctx.lineTo(screenX + CELL_SIZE, screenY + CELL_SIZE);
                    ctx.stroke();
                }
                // Left wall
                if (!labyrinth.isEdgeOpen(globalX, globalY, 3)) {
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY);
                    ctx.lineTo(screenX, screenY + CELL_SIZE);
                    ctx.stroke();
                }
            }
        }
        
        // Draw observer point (green channel)
        const observerScreenX = halfCellsX * CELL_SIZE;
        const observerScreenY = halfCellsY * CELL_SIZE;
        const observerSize = CELL_SIZE * 0.8;
        const observerOffset = CELL_SIZE * 0.1;
        
        ctx.fillStyle = 'rgb(0, 180, 0)'; // Reduced from 255 to 180 for lower contrast
        ctx.fillRect(observerScreenX + observerOffset, observerScreenY + observerOffset, observerSize, observerSize);
    }
    
    render(deltaTime) {
        this.time += deltaTime;
        
        const gl = this.gl;
        const labyrinth = this.labyrinth;
        
        // Check if viewport has changed
        const currentViewportState = {
            cellX: labyrinth.viewportOffset.cellX,
            cellY: labyrinth.viewportOffset.cellY,
            pixelX: labyrinth.viewportOffset.pixelX,
            pixelY: labyrinth.viewportOffset.pixelY,
            visitedCount: labyrinth.visitedSet.size
        };
        
        const viewportChanged = !this.lastViewportState || 
            this.lastViewportState.cellX !== currentViewportState.cellX ||
            this.lastViewportState.cellY !== currentViewportState.cellY ||
            this.lastViewportState.pixelX !== currentViewportState.pixelX ||
            this.lastViewportState.pixelY !== currentViewportState.pixelY ||
            this.lastViewportState.visitedCount !== currentViewportState.visitedCount;
        
        // Always update texture during movement to ensure smooth sub-pixel movement
        if (viewportChanged || labyrinth.viewportOffset.isMoving) {
            this.renderLabyrinthToTexture();
            this.lastViewportState = currentViewportState;
        }
        
        // Apply shader effects
        gl.useProgram(this.program);
        
        // Set vertex attributes
        const posLoc = gl.getAttribLocation(this.program, 'position');
        const texLoc = gl.getAttribLocation(this.program, 'texCoord');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
        
        // Set uniforms
        const timeLoc = gl.getUniformLocation(this.program, 'uTime');
        const resLoc = gl.getUniformLocation(this.program, 'uResolution');
        const textureLoc = gl.getUniformLocation(this.program, 'uLabyrinthTexture');
        
        gl.uniform1f(timeLoc, this.time);
        gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
        gl.uniform1i(textureLoc, 0);
        
        // Bind labyrinth texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.labyrinthTexture);
        
        // Render fullscreen quad
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}

