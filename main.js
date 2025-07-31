class DancingGirlApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mixer = null;
        this.character = null;
        this.animations = {};
        this.currentAction = null;
        this.clock = new THREE.Clock(); // Add clock for proper delta time
        
        // Audio Analysis
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = null;
        this.frequencyData = null;
        this.dataArray = null;
        
        // --- UPGRADE: Enhanced Beat Detection with better sensitivity ---
        this.beatState = {
            bass: { 
                history: new Array(30).fill(0), // Shorter history for faster response
                threshold: 1.2, // Much more sensitive
                lastBeat: 0, 
                isBeat: false,
                energy: 0,
                peak: 0
            },
            snare: { 
                history: new Array(30).fill(0), // Shorter history for faster response
                threshold: 1.3, // Much more sensitive
                lastBeat: 0, 
                isBeat: false,
                energy: 0,
                peak: 0
            },
            mid: {
                history: new Array(30).fill(0),
                threshold: 1.1,
                lastBeat: 0,
                isBeat: false,
                energy: 0,
                peak: 0
            },
            beatCooldown: 150, // Much shorter cooldown for more responsive beats
            lastBeatTime: 0,
            overallEnergy: 0,
            beatCount: 0
        };
        
        // Animation timing control
        this.animationStartTime = 0;
        this.minAnimationDuration = 3000; // 3 seconds minimum (reduced from 12)
        this.lastAnimationSwitch = 0;
        
        // Debug timer for character disappearance
        this.startTime = Date.now();
        this.lastCharacterCheck = Date.now();
        
        // Enhanced error handling
        this.errors = [];
        this.maxErrors = 10;
        
        // Animation Control
        this.bassThreshold = 0.7;
        this.snareThreshold = 0.6;
        this.isBeating = false;
        
        this.init();
    }
    
    init() {
        try {
            this.setupScene();
            this.setupLighting();
            this.setupCamera();
            this.setupRenderer();
            this.loadCharacter();
            this.setupAudio();
            this.setupControls();
            this.animate();
            console.log('✅ App initialized successfully');
        } catch (error) {
            this.handleError('Initialization failed', error);
        }
    }
    
    handleError(context, error) {
        console.error(`❌ ${context}:`, error);
        this.errors.push({ context, error, timestamp: Date.now() });
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Add fog for atmosphere
        this.scene.fog = new THREE.Fog(0x000011, 1, 100);
        
        // Add a simple ground plane to test rendering
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        this.scene.add(ground);
        
        // Add a debug cube that should always be visible
        const debugGeometry = new THREE.BoxGeometry(1, 1, 1);
        const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        this.debugCube = new THREE.Mesh(debugGeometry, debugMaterial);
        this.debugCube.position.set(0, 2, 0);
        this.scene.add(this.debugCube);
        
        // Add a debug sphere at character position
        const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.debugSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.debugSphere.position.set(0, 0, 0);
        this.scene.add(this.debugSphere);
        
        console.log('🌍 Added ground plane and debug cube for testing');
    }
    
    setupLighting() {
        // Much brighter ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // Brighter directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(0, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);

        // Add a spotlight directly on the character
        const spotlight = new THREE.SpotLight(0xffffff, 2);
        spotlight.position.set(0, 10, 0);
        spotlight.target.position.set(0, 0, 0);
        spotlight.angle = Math.PI / 4;
        spotlight.penumbra = 0.1;
        spotlight.decay = 2;
        spotlight.distance = 200;
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);

        // Store lights in an array for easy access
        this.pointLights = [];
        const lightColors = [0xff0040, 0x0040ff, 0x40ff00, 0xffaa00];
        lightColors.forEach((color, i) => {
            const light = new THREE.PointLight(color, 2, 50, 2);
            const angle = (i / lightColors.length) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 10, 2, Math.sin(angle) * 10);
            this.scene.add(light);
            this.pointLights.push(light);
        });
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 3, 10); // Further back and higher
        this.camera.lookAt(0, 0, 0);
        console.log('📷 Camera position:', this.camera.position);
        console.log('📷 Camera target:', new THREE.Vector3(0, 0, 0));
    }
    
    setupRenderer() {
        const canvas = document.getElementById('canvas3d');
        console.log('🎨 Canvas element:', canvas);
        console.log('🎨 Canvas size:', canvas.width, 'x', canvas.height);
        
        // Check WebGL support
        if (!window.WebGLRenderingContext) {
            console.error('❌ WebGL not supported!');
            return;
        }
        
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('❌ WebGL context not available!');
            return;
        }
        console.log('✅ WebGL supported:', gl.getParameter(gl.VERSION));
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        console.log('🎨 Renderer created successfully');
        console.log('🎨 Renderer size:', this.renderer.domElement.width, 'x', this.renderer.domElement.height);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    async loadCharacter() {
        const loader = new THREE.GLTFLoader();
        
        try {
            console.log('🔄 Loading model from: ./models/dancing_girl.glb');
            const gltf = await new Promise((resolve, reject) => {
                loader.load('./models/dancing_girl.glb?v=' + Date.now(), resolve, undefined, reject);
            });
            
            console.log('✅ Model loaded successfully:', gltf);
            console.log('🎯 GLTF scene children:', gltf.scene.children.length);
            console.log('🎯 GLTF animations:', gltf.animations.length);
            
            // Debug: Log scene structure
            console.log('🎯 Scene structure:');
            gltf.scene.traverse(child => {
                console.log('  -', child.type, child.name, child.position);
            });
            
            this.character = gltf.scene;
            this.character.scale.set(3, 3, 3); // Much bigger scale
            this.character.position.set(0, 0, 0); // Center position
            
            // Debug: Log character bounds
            const box = new THREE.Box3().setFromObject(this.character);
            console.log('🎯 Character bounds:', box);
            console.log('🎯 Character center:', box.getCenter(new THREE.Vector3()));
            
            // Enable shadows
            this.character.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Setup animations
            this.mixer = new THREE.AnimationMixer(this.character);
            
            // Debug: Log all available animations with details
            console.log('=== ANIMATION DEBUG ===');
            console.log('Total animations found:', gltf.animations.length);
            
            if (gltf.animations.length === 0) {
                console.error('❌ NO ANIMATIONS FOUND IN MODEL!');
                console.error('This model appears to be static (T-pose only)');
                console.error('You need a model with animations to see dancing');
                console.error('🔧 SOLUTION: Re-export from Blender with "Include Animations" checked');
                this.scene.add(this.character);
                return;
            }
            
            // Map animations by name and log available animations
            console.log('Available animations:', gltf.animations.map(a => a.name));
            gltf.animations.forEach((clip, index) => {
                console.log(`✅ Animation ${index}: "${clip.name}" - Duration: ${clip.duration}s - Tracks: ${clip.tracks.length}`);
                const action = this.mixer.clipAction(clip);
                this.animations[clip.name] = action;
                console.log('Loaded animation:', clip.name);
            });
            
            console.log('📋 Available animation names:', Object.keys(this.animations));
            
                         // Try to find idle animation first (priority for startup)
             let foundAnimation = null;
             
                         // First priority: Look for exact "Idle" animation
            console.log('🔍 Searching for Idle animation...');
            console.log('🔍 Available animations:', Object.keys(this.animations));
            
            if (this.animations['Idle']) {
                foundAnimation = 'Idle';
                console.log('🎵 Found exact Idle animation for startup');
            }
             // Second priority: Look for idle-related animations
             else {
                 const idleKeywords = ['idle', 'stand', 'rest', 'wait'];
                 for (const animName of Object.keys(this.animations)) {
                     const lowerName = animName.toLowerCase();
                     if (idleKeywords.some(keyword => lowerName.includes(keyword))) {
                         foundAnimation = animName;
                         console.log('🎵 Found idle animation by keyword:', animName);
                         break;
                     }
                 }
             }
             
             // Third priority: Look for dance animations
             if (!foundAnimation) {
                 const danceKeywords = ['dance', 'dancing', 'walk', 'run', 'jump', 'move'];
                 for (const animName of Object.keys(this.animations)) {
                     const lowerName = animName.toLowerCase();
                     if (danceKeywords.some(keyword => lowerName.includes(keyword))) {
                         foundAnimation = animName;
                         console.log('🎵 Found dance animation by keyword:', animName);
                         break;
                     }
                 }
             }
             
             // Last resort: Use the first available animation (avoid T-Pose)
             if (!foundAnimation && Object.keys(this.animations).length > 0) {
                 const availableAnimations = Object.keys(this.animations);
                 // Skip T-Pose if possible
                 const nonTposeAnimations = availableAnimations.filter(name => 
                     !name.toLowerCase().includes('t-pose') && 
                     !name.toLowerCase().includes('tpose')
                 );
                 
                 if (nonTposeAnimations.length > 0) {
                     foundAnimation = nonTposeAnimations[0];
                     console.log('🔄 Using first non-T-pose animation:', foundAnimation);
                 } else {
                     foundAnimation = availableAnimations[0];
                     console.log('🔄 Using first available animation:', foundAnimation);
                 }
             }
            
            if (foundAnimation) {
                console.log('🎬 Starting initial animation:', foundAnimation);
                this.playAnimation(foundAnimation, 0.1);
                console.log('🎬 Started animation:', foundAnimation);
                                 console.log('⏱️ Minimum animation duration: 3 seconds');
                
                // Force immediate animation start
                setTimeout(() => {
                    if (this.currentAction && this.currentAction.isRunning()) {
                        console.log('✅ Initial animation is running successfully');
                    } else {
                        console.warn('❌ Initial animation failed to start!');
                        // Try to force start again
                        this.playAnimation(foundAnimation, 0.1);
                    }
                }, 200);
            } else {
                console.warn('⚠️ No animations found in the model!');
            }
            
            this.scene.add(this.character);
            console.log('✅ Character loaded successfully.');
            console.log('🎯 Scene children count:', this.scene.children.length);
            console.log('🎯 Character position:', this.character.position);
            console.log('🎯 Character scale:', this.character.scale);
            console.log('🎯 Character visible:', this.character.visible);
            console.log('🎯 Camera position:', this.camera.position);
            
            // Debug: Check if character is in camera frustum
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(matrix);
            const characterBox = new THREE.Box3().setFromObject(this.character);
            console.log('🎯 Character in frustum:', frustum.intersectsBox(characterBox));
            
        } catch (error) {
            console.error('❌ Error loading character:', error);
        }
    }
    
    setupAudio() {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024; // Smaller size is more responsive
        this.analyser.smoothingTimeConstant = 0.7; // Lower for faster reaction
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.dataArray = new Float32Array(bufferLength);
        
        console.log('Audio context created, analyser ready');
    }
    
    setupControls() {
        const audioFileInput = document.getElementById('audioFile');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        const handleFile = (file) => {
            if (file) {
                 if (this.audioElement) {
                    this.audioElement.pause();
                    URL.revokeObjectURL(this.audioElement.src);
                }
                console.log('Loading audio file:', file.name);
                this.loadAudioFile(file);
            }
        };

        audioFileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        playBtn.addEventListener('click', () => this.audioElement?.play());
        pauseBtn.addEventListener('click', () => this.audioElement?.pause());

        // Allow drag and drop
        const container = document.getElementById('container');
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
        
        console.log('Controls setup complete');
    }
    
    async loadAudioFile(file) {
        try {
            console.log('Loading audio file:', file.name);
            
            // Create audio element
            this.audioElement = new Audio();
            this.audioElement.src = URL.createObjectURL(file);
            this.audioElement.crossOrigin = 'anonymous';
            
            // Connect to Web Audio API
            const source = this.audioContext.createMediaElementSource(this.audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            console.log('Audio connected to Web Audio API');
            
            // Detect BPM
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Use beat detector library
            if (window.webAudioBeatDetector) {
                const { analyze } = window.webAudioBeatDetector;
                this.bpm = await analyze(audioBuffer);
                document.getElementById('bpm').textContent = Math.round(this.bpm);
                console.log('BPM detected:', this.bpm);
            } else {
                console.warn('Beat detector library not available, using fallback detection');
                // Fallback: Simple BPM detection based on audio duration
                const duration = audioBuffer.duration;
                const estimatedBPM = Math.round(60 / (duration / 8)); // Rough estimate
                this.bpm = estimatedBPM;
                document.getElementById('bpm').textContent = estimatedBPM;
                console.log('Estimated BPM:', estimatedBPM);
            }
            
            console.log('Audio loaded successfully');
            
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }
    
    playAnimation(animationName, fadeTime = 0.3) {
        if (!this.animations[animationName]) {
            console.warn(`⚠️ Animation "${animationName}" not found. Available:`, Object.keys(this.animations));
            return;
        }
        
        if (this.currentAction && this.currentAction === this.animations[animationName]) {
            return; // Already playing this animation
        }

        console.log(`🎬 Playing animation: "${animationName}"`);
        
        const newAction = this.animations[animationName];
        const oldAction = this.currentAction;

        if (oldAction && oldAction !== newAction) {
            console.log(`⏹️ Fading out: "${animationName}"`);
            oldAction.fadeOut(fadeTime);
        }

        console.log(`▶️ Fading in: "${animationName}"`);
        newAction.reset().setEffectiveWeight(1).fadeIn(fadeTime).play();
        this.currentAction = newAction;
        
        // Force mixer update to ensure animation starts
        if (this.mixer) {
            this.mixer.update(0);
        }
        
        // Record animation start time for minimum duration
        this.animationStartTime = Date.now();
        this.lastAnimationSwitch = Date.now();
        
        // Debug: Check if animation is actually playing
        setTimeout(() => {
            if (newAction.isRunning()) {
                console.log(`✅ Animation "${animationName}" is running successfully`);
            } else {
                console.warn(`❌ Animation "${animationName}" is not running!`);
                console.warn('This might indicate a problem with the animation or mixer');
            }
        }, 100);
    }
    
    // --- UPGRADE: Enhanced beat detection with multiple frequency bands and adaptive thresholds ---
    analyzeAudio() {
        if (!this.analyser || !this.audioElement || this.audioElement.paused) {
            // Reset beat state when paused
            Object.keys(this.beatState).forEach(key => {
                if (this.beatState[key] && typeof this.beatState[key] === 'object' && this.beatState[key].isBeat !== undefined) {
                    this.beatState[key].isBeat = false;
                }
            });
            return { overallVolume: 0 };
        }

        this.analyser.getByteFrequencyData(this.frequencyData);
        const bufferLength = this.analyser.frequencyBinCount;

        // Enhanced frequency analysis with more bands
        const nyquist = this.audioContext.sampleRate / 2;
        const getEnergy = (startFreq, endFreq) => {
            const startIdx = Math.floor((startFreq / nyquist) * bufferLength);
            const endIdx = Math.ceil((endFreq / nyquist) * bufferLength);
            let sum = 0;
            let count = 0;
            for (let i = startIdx; i <= endIdx && i < bufferLength; i++) {
                sum += this.frequencyData[i];
                count++;
            }
            return count > 0 ? sum / count / 255 : 0; // Normalize to 0-1
        };

        // Multiple frequency bands for better beat detection
        const subBass = getEnergy(20, 60);      // Sub-bass (kick drums)
        const bass = getEnergy(60, 250);        // Bass (bass guitar, kick)
        const lowMid = getEnergy(250, 500);     // Low-mid (snare body)
        const mid = getEnergy(500, 2000);       // Mid (snare, vocals)
        const highMid = getEnergy(2000, 4000);  // High-mid (hi-hats, cymbals)
        const high = getEnergy(4000, 8000);     // High (cymbals, effects)
        
        const bassLevel = (subBass + bass) / 2; // Combined bass
        const snareLevel = (lowMid + mid) / 2;  // Combined snare
        const midLevel = (mid + highMid) / 2;   // Combined mid
        const overallVolume = getEnergy(20, 16000);

        // Enhanced beat detection with adaptive thresholds
        const detectBeat = (band, level) => {
            const state = this.beatState[band];
            if (!state) return;
            
            // Update energy tracking
            state.energy = level;
            state.peak = Math.max(state.peak, level);
            
            // Calculate dynamic average (more recent samples have more weight)
            let weightedSum = 0;
            let weight = 1;
            let totalWeight = 0;
            
            for (let i = state.history.length - 1; i >= 0; i--) {
                weightedSum += state.history[i] * weight;
                totalWeight += weight;
                weight *= 0.9; // Decay factor
            }
            
            const dynamicAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
            
            // Adaptive threshold based on overall energy
            const adaptiveThreshold = state.threshold * (1 + this.beatState.overallEnergy * 0.5);
            
            // Beat detection logic
            const isPeak = level > dynamicAvg * adaptiveThreshold;
            const isStrongEnough = level > 0.1; // Minimum energy threshold
            const timeSinceLastBeat = Date.now() - this.beatState.lastBeatTime;
            const cooldownPassed = timeSinceLastBeat > this.beatState.beatCooldown;
            
            state.isBeat = false;
            if (isPeak && isStrongEnough && cooldownPassed) {
                state.isBeat = true;
                this.beatState.lastBeatTime = Date.now();
                this.beatState.beatCount++;
                
                // Dynamic cooldown adjustment based on beat frequency
                if (this.beatState.beatCount > 10) {
                    const avgBeatInterval = timeSinceLastBeat / this.beatState.beatCount;
                    this.beatState.beatCooldown = Math.max(50, Math.min(300, avgBeatInterval * 0.8));
                }
            }
            
            // Update history
            state.history.shift();
            state.history.push(level);
            
            // Decay peak over time
            state.peak *= 0.95;
        };

        // Update overall energy
        this.beatState.overallEnergy = overallVolume;
        
        // Detect beats in all bands
        detectBeat('bass', bassLevel);
        detectBeat('snare', snareLevel);
        detectBeat('mid', midLevel);

        // Enhanced UI updates
        document.getElementById('bassLevel').textContent = (bassLevel * 100).toFixed(1) + '%';
        
        let beatStatus = '...';
        if (this.beatState.bass.isBeat) beatStatus = 'BASS';
        if (this.beatState.snare.isBeat) beatStatus = 'SNARE';
        if (this.beatState.mid.isBeat) beatStatus = 'MID';
        document.getElementById('beatStatus').textContent = beatStatus;
        
        // Enhanced debug logging
        if (Math.random() < 0.02) { // 2% chance per frame for more frequent logging
            console.log('🎵 Enhanced Beat Debug:');
            console.log('  Bass:', (bassLevel * 100).toFixed(1) + '%', this.beatState.bass.isBeat ? '🔥' : '');
            console.log('  Snare:', (snareLevel * 100).toFixed(1) + '%', this.beatState.snare.isBeat ? '🔥' : '');
            console.log('  Mid:', (midLevel * 100).toFixed(1) + '%', this.beatState.mid.isBeat ? '🔥' : '');
            console.log('  Overall:', (overallVolume * 100).toFixed(1) + '%');
            console.log('  Beat Count:', this.beatState.beatCount);
            console.log('  Cooldown:', this.beatState.beatCooldown + 'ms');
        }

        return {
            overallVolume,
            bassLevel,
            snareLevel,
            midLevel,
            isBassBeat: this.beatState.bass.isBeat,
            isSnareBeat: this.beatState.snare.isBeat,
            isMidBeat: this.beatState.mid.isBeat,
            beatCount: this.beatState.beatCount
        };
    }
    
    // --- UPGRADE: Smarter animation logic based on detected beats ---
    updateDanceMovements(audioData) {
        if (!this.character) return;
        
        const currentTime = Date.now();
        const timeSinceLastSwitch = currentTime - this.lastAnimationSwitch;
        
        // Check if minimum animation duration has passed
        if (timeSinceLastSwitch < this.minAnimationDuration) {
            // Still in minimum duration period, don't switch animations
            if (Math.random() < 0.01) { // Log occasionally
                console.log(`⏱️ Animation locked for ${(this.minAnimationDuration - timeSinceLastSwitch)/1000}s more`);
            }
            return;
        }
        
        let targetAnimation = this.currentAction ? this.currentAction._clip.name : null;
        
        const animations = this.animations;
        const availableAnimations = Object.keys(animations);
        
        if (availableAnimations.length === 0) {
            console.warn('No animations available for character');
            return;
        }
        
        // Get the first animation as fallback
        const fallback = availableAnimations[0];
        
        // Try to find animations by keywords
        const findAnimationByKeyword = (keywords) => {
            for (const animName of availableAnimations) {
                const lowerName = animName.toLowerCase();
                if (keywords.some(keyword => lowerName.includes(keyword))) {
                    return animName;
                }
            }
            return null;
        };
        
        // Find specific dance animations
        const highEnergyDance = findAnimationByKeyword(['hip', 'hop', 'dance', 'energetic', 'fast']);
        const mediumDance = findAnimationByKeyword(['dance', 'move', 'walk', 'idle']);
        const idleDance = findAnimationByKeyword(['idle', 'stand', 'rest']);
        
        // Use found animations or fallback
        const highEnergy = highEnergyDance || fallback;
        const medium = mediumDance || fallback;
        const idle = idleDance || fallback;

        // Enhanced logic: More responsive animation switching with better beat detection
        const hasAnyBeat = audioData.isBassBeat || audioData.isSnareBeat || audioData.isMidBeat;
        const isHighEnergy = audioData.bassLevel > 0.4 || audioData.overallVolume > 0.6;
        const isMediumEnergy = audioData.snareLevel > 0.3 || audioData.midLevel > 0.3 || audioData.overallVolume > 0.3;
        
        if (hasAnyBeat && isHighEnergy && highEnergy) {
            // High energy dance on any beat with high energy
            targetAnimation = highEnergy;
            console.log(`🔥 High energy dance triggered by ${audioData.isBassBeat ? 'BASS' : audioData.isSnareBeat ? 'SNARE' : 'MID'} beat`);
        } else if (hasAnyBeat && isMediumEnergy && medium) {
            // Medium dance on any beat with medium energy
            targetAnimation = medium;
            console.log(`🎵 Medium dance triggered by ${audioData.isBassBeat ? 'BASS' : audioData.isSnareBeat ? 'SNARE' : 'MID'} beat`);
        } else if (audioData.overallVolume > 0.2 && medium) {
            // Medium dance on general volume
            if (this.currentAction && this.currentAction._clip.name !== highEnergy) {
                targetAnimation = medium;
            }
        } else if (audioData.overallVolume < 0.1 && idle) {
            // Idle when very quiet
            targetAnimation = idle;
        }
        
        // --- FIX: Only switch animation when the target changes and minimum time has passed ---
        if (targetAnimation && (!this.currentAction || targetAnimation !== this.currentAction._clip.name)) {
             console.log(`🎵 Switching to animation: "${targetAnimation}" (after ${(timeSinceLastSwitch/1000).toFixed(1)}s)`);
             console.log(`⏱️ Minimum duration enforced: 3 seconds`);
             console.log(`🎯 Current animation: ${this.currentAction ? this.currentAction._clip.name : 'none'}`);
             console.log(`🎯 Target animation: ${targetAnimation}`);
             this.playAnimation(targetAnimation);
        }

        // Other reactive effects - DISABLED SCALE CHANGES FOR DEBUG
        // const scale = 1.2 + (audioData.bassLevel * 0.1);
        // this.character.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2);
        
        // Force character scale to stay at 3,3,3
        this.character.scale.set(3, 3, 3);
        
        // Debug: Check if character is still in scene
        if (!this.scene.children.includes(this.character)) {
            console.error('❌ Character was removed from scene! Re-adding...');
            this.scene.add(this.character);
        }

        const time = Date.now() * 0.001;
        this.pointLights.forEach((light, i) => {
            light.intensity = 1 + audioData.overallVolume * 3 + (this.beatState.bass.isBeat ? 2 : 0);
            const angle = time * 0.5 + (i / this.pointLights.length) * Math.PI * 2;
            light.position.x = Math.cos(angle) * (8 + Math.sin(time * 0.3));
            light.position.z = Math.sin(angle) * (8 + Math.cos(time * 0.3));
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // --- FIX: Use correct delta time from THREE.Clock ---
        const deltaTime = this.clock.getDelta();

        if (this.mixer) {
            this.mixer.update(deltaTime);
            
            // Debug: Log mixer state occasionally
            if (Math.random() < 0.01) { // 1% chance per frame
                const actions = this.mixer._actions;
                if (actions.length > 0) {
                    console.log('Mixer actions:', actions.map(a => ({
                        name: a._clip.name,
                        isRunning: a.isRunning(),
                        weight: a.getEffectiveWeight(),
                        time: a.time
                    })));
                }
            }
            
            // Debug: Check if current action is running
            if (this.currentAction && !this.currentAction.isRunning()) {
                console.warn('⚠️ Current action is not running!');
                console.warn('Action:', this.currentAction._clip.name);
                console.warn('Is running:', this.currentAction.isRunning());
                console.warn('Weight:', this.currentAction.getEffectiveWeight());
            }
        }
        
        // ENHANCED: Better character visibility and scene inclusion checks
        if (this.character) {
            const currentTime = Date.now();
            const timeSinceStart = (currentTime - this.startTime) / 1000;
            
            // Check every 60 frames (about twice per second at 30fps)
            if (Math.random() < 0.06) {
                console.log(`🔍 Character check at ${timeSinceStart.toFixed(1)}s - Visible:`, this.character.visible, 'In scene:', this.scene.children.includes(this.character));
                console.log(`📏 Character scale:`, this.character.scale.x.toFixed(3), this.character.scale.y.toFixed(3), this.character.scale.z.toFixed(3));
                console.log(`📍 Character position:`, this.character.position.x.toFixed(3), this.character.position.y.toFixed(3), this.character.position.z.toFixed(3));
                
                // Force character to stay visible and in scene
                if (!this.character.visible) {
                    console.error(`❌ CHARACTER BECAME INVISIBLE at ${timeSinceStart.toFixed(1)}s! Making visible...`);
                    this.character.visible = true;
                    // Also check all child meshes
                    this.character.traverse(child => {
                        if (child.isMesh) {
                            child.visible = true;
                        }
                    });
                }
                
                if (!this.scene.children.includes(this.character)) {
                    console.error(`❌ CHARACTER REMOVED FROM SCENE at ${timeSinceStart.toFixed(1)}s! Re-adding...`);
                    this.scene.add(this.character);
                }
                
                // Additional safety: ensure character position is valid
                if (isNaN(this.character.position.x) || isNaN(this.character.position.y) || isNaN(this.character.position.z)) {
                    console.error(`❌ CHARACTER POSITION IS INVALID at ${timeSinceStart.toFixed(1)}s! Resetting...`);
                    this.character.position.set(0, 0, 0);
                }
                
                // Check if character scale is too small (invisible)
                if (this.character.scale.x < 0.1 || this.character.scale.y < 0.1 || this.character.scale.z < 0.1) {
                    console.error(`❌ CHARACTER SCALE TOO SMALL at ${timeSinceStart.toFixed(1)}s! Resetting scale...`);
                    this.character.scale.set(3, 3, 3);
                }
                
                // Check if character is too far from camera
                const distanceFromCamera = this.character.position.distanceTo(this.camera.position);
                if (distanceFromCamera > 50) {
                    console.error(`❌ CHARACTER TOO FAR FROM CAMERA at ${timeSinceStart.toFixed(1)}s! Distance: ${distanceFromCamera.toFixed(1)}`);
                    this.character.position.set(0, 0, 0);
                }
                
                // Check character materials
                this.character.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (child.material.opacity !== undefined && child.material.opacity < 0.1) {
                            console.error(`❌ CHARACTER MATERIAL TOO TRANSPARENT at ${timeSinceStart.toFixed(1)}s! Opacity: ${child.material.opacity}`);
                            child.material.opacity = 1.0;
                            child.material.transparent = false;
                        }
                        if (child.material.visible === false) {
                            console.error(`❌ CHARACTER MATERIAL INVISIBLE at ${timeSinceStart.toFixed(1)}s!`);
                            child.material.visible = true;
                        }
                    }
                });
            }
        }
        
        const audioData = this.analyzeAudio();
        this.updateDanceMovements(audioData);

        // Enhanced camera movement
        if (this.audioElement && !this.audioElement.paused) {
            const time = this.clock.elapsedTime;
            const audioInfluence = audioData.overallVolume * 0.3;
            this.camera.position.x = Math.sin(time * 0.2) * (1.5 + audioInfluence);
            this.camera.position.z = 6 + Math.cos(time * 0.2) * (1.5 + audioInfluence);
            this.camera.lookAt(0, 1, 0);
        }

        // Debug: Log render info occasionally
        if (Math.random() < 0.005) { // 0.5% chance per frame
            console.log('🎬 Rendering frame - Scene children:', this.scene.children.length);
            if (this.character) {
                console.log('🎯 Character visible:', this.character.visible);
                console.log('🎯 Character position:', this.character.position);
                console.log('🎯 Character in scene:', this.scene.children.includes(this.character));
            }
        }
        
        // ENHANCED: Better error handling for rendering
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('❌ Render error:', error);
            // Try to recover by re-adding character
            if (this.character && !this.scene.children.includes(this.character)) {
                console.log('🔄 Recovering from render error - re-adding character');
                this.scene.add(this.character);
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Resume audio context on first user interaction
    document.body.addEventListener('click', () => {
        if (window.app && window.app.audioContext.state === 'suspended') {
            window.app.audioContext.resume();
        }
    }, { once: true });
    
    window.app = new DancingGirlApp();
}); 