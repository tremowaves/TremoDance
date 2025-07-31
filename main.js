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
        
        // --- UPGRADE: Advanced Beat Detection ---
        this.beatState = {
            bass: { history: new Array(60).fill(0), threshold: 1.3, lastBeat: 0, isBeat: false },
            snare: { history: new Array(60).fill(0), threshold: 1.5, lastBeat: 0, isBeat: false },
            beatCooldown: 150, // Minimum ms between beats for the same band
            lastBeatTime: 0
        };
        
        // Animation Control
        this.bassThreshold = 0.7;
        this.snareThreshold = 0.6;
        this.isBeating = false;
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupLighting();
        this.setupCamera();
        this.setupRenderer();
        this.loadCharacter();
        this.setupAudio();
        this.setupControls();
        this.animate();
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
        console.log('🌍 Added ground plane for testing');
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
            
            // Try to find any dance-related animation
            const danceKeywords = ['dance', 'dancing', 'idle', 'walk', 'run', 'jump', 'move', 'animation'];
            let foundAnimation = null;
            
            // First, try to find exact matches from Blender
            const exactMatches = ['Idle_Dance', 'Hip_Hop_Dancing', 'Jazz_Dance', 'Samba_Dancing'];
            for (const exactName of exactMatches) {
                if (this.animations[exactName]) {
                    foundAnimation = exactName;
                    console.log('🎵 Found exact animation match:', exactName);
                    break;
                }
            }
            
            // If no exact match, try keyword search
            if (!foundAnimation) {
                for (const animName of Object.keys(this.animations)) {
                    const lowerName = animName.toLowerCase();
                    if (danceKeywords.some(keyword => lowerName.includes(keyword))) {
                        foundAnimation = animName;
                        console.log('🎵 Found dance animation by keyword:', animName);
                        break;
                    }
                }
            }
            
            // If no dance animation found, use the first available
            if (!foundAnimation && Object.keys(this.animations).length > 0) {
                foundAnimation = Object.keys(this.animations)[0];
                console.log('🔄 Using first available animation:', foundAnimation);
            }
            
            if (foundAnimation) {
                this.playAnimation(foundAnimation, 0.1);
                console.log('🎬 Started animation:', foundAnimation);
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
                console.warn('Beat detector library not available');
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
    
    // --- UPGRADE: Switched to more accurate, peak-based beat detection ---
    analyzeAudio() {
        if (!this.analyser || !this.audioElement || this.audioElement.paused) {
            // Reset beat state when paused
            if (this.beatState.bass) this.beatState.bass.isBeat = false;
            if (this.beatState.snare) this.beatState.snare.isBeat = false;
            return { overallVolume: 0 };
        }

        this.analyser.getByteFrequencyData(this.frequencyData);
        const bufferLength = this.analyser.frequencyBinCount;

        // --- FIX: Corrected frequency ranges ---
        const nyquist = this.audioContext.sampleRate / 2;
        const getEnergy = (startFreq, endFreq) => {
            const startIdx = Math.floor((startFreq / nyquist) * bufferLength);
            const endIdx = Math.ceil((endFreq / nyquist) * bufferLength);
            let sum = 0;
            for (let i = startIdx; i <= endIdx; i++) {
                sum += this.frequencyData[i];
            }
            return sum / (endIdx - startIdx + 1) / 255; // Normalize to 0-1
        };

        const bassLevel = getEnergy(20, 250);   // Bass range
        const snareLevel = getEnergy(1000, 4000); // Snare/mid-high range
        const overallVolume = getEnergy(20, 16000);

        // Detect beat by comparing current energy to historical average
        const detectPeak = (band, level) => {
            const state = this.beatState[band];
            const avg = state.history.reduce((a, b) => a + b, 0) / state.history.length;
            
            state.isBeat = false;
            if (level > avg * state.threshold && Date.now() - this.beatState.lastBeatTime > this.beatState.beatCooldown) {
                state.isBeat = true;
                this.beatState.lastBeatTime = Date.now();
            }
            
            state.history.shift();
            state.history.push(level);
        };

        detectPeak('bass', bassLevel);
        detectPeak('snare', snareLevel);

        // Update UI
        document.getElementById('bassLevel').textContent = (bassLevel * 100).toFixed(1) + '%';
        let beatStatus = '...';
        if(this.beatState.bass.isBeat) beatStatus = 'BASS';
        if(this.beatState.snare.isBeat) beatStatus = 'SNARE';
        document.getElementById('beatStatus').textContent = beatStatus;

        return {
            overallVolume,
            bassLevel,
            snareLevel,
            isBassBeat: this.beatState.bass.isBeat,
            isSnareBeat: this.beatState.snare.isBeat
        };
    }
    
    // --- UPGRADE: Smarter animation logic based on detected beats ---
    updateDanceMovements(audioData) {
        if (!this.character) return;
        
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

        // Logic: Beats have the highest priority. If no beat, decide based on volume.
        if (audioData.isBassBeat && highEnergy) {
            targetAnimation = highEnergy;
        } else if (audioData.isSnareBeat && medium) {
            targetAnimation = medium;
        } else if (audioData.overallVolume > 0.25) {
            // Avoid switching back and forth rapidly if already in a beat-driven dance
            if (this.currentAction && this.currentAction._clip.name !== highEnergy) {
                 targetAnimation = medium;
            }
        } else if (audioData.overallVolume < 0.1) {
            targetAnimation = idle;
        }
        
        // --- FIX: Only switch animation when the target changes ---
        if (targetAnimation && (!this.currentAction || targetAnimation !== this.currentAction._clip.name)) {
             console.log('Switching to animation:', targetAnimation);
             this.playAnimation(targetAnimation);
        }

        // Other reactive effects
        const scale = 1.2 + (audioData.bassLevel * 0.1);
        this.character.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2);

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
        }
        
        const audioData = this.analyzeAudio();
        this.updateDanceMovements(audioData);

        // Dynamic camera
        if (this.audioElement && !this.audioElement.paused) {
            const time = this.clock.elapsedTime;
            this.camera.position.x = Math.sin(time * 0.2) * 1.5;
            this.camera.position.z = 6 + Math.cos(time * 0.2) * 1.5;
            this.camera.lookAt(0, 1, 0);
        }

        // Debug: Log render info occasionally
        if (Math.random() < 0.005) { // 0.5% chance per frame
            console.log('🎬 Rendering frame - Scene children:', this.scene.children.length);
        }
        
        this.renderer.render(this.scene, this.camera);
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