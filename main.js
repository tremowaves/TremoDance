class DancingGirlApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mixer = null;
        this.character = null;
        this.animations = {};
        this.currentAction = null;
        
        // Audio Analysis
        this.audioContext = null;
        this.analyser = null;
        this.audioElement = null;
        this.frequencyData = null;
        this.dataArray = null;
        
        // Beat Detection
        this.beatDetector = null;
        this.lastBeatTime = 0;
        this.bpm = 0;
        
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
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Colored lights for dance atmosphere
        const light1 = new THREE.PointLight(0xff0040, 1, 50);
        light1.position.set(-10, 0, 10);
        this.scene.add(light1);
        
        const light2 = new THREE.PointLight(0x0040ff, 1, 50);
        light2.position.set(10, 0, 10);
        this.scene.add(light2);
        
        const light3 = new THREE.PointLight(0x40ff00, 1, 50);
        light3.position.set(0, 10, -10);
        this.scene.add(light3);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 1, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas3d'),
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
            const gltf = await new Promise((resolve, reject) => {
                loader.load('./models/dancing_girl.glb', resolve, undefined, reject);
            });
            
            this.character = gltf.scene;
            this.character.scale.set(1, 1, 1);
            this.character.position.set(0, 0, 0);
            
            // Enable shadows
            this.character.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Setup animations
            this.mixer = new THREE.AnimationMixer(this.character);
            
            // Map animations by name and log available animations
            console.log('Available animations:', gltf.animations.map(a => a.name));
            gltf.animations.forEach((clip) => {
                const action = this.mixer.clipAction(clip);
                this.animations[clip.name] = action;
                console.log('Loaded animation:', clip.name);
            });
            
            // Start with first available animation
            const firstAnimation = Object.keys(this.animations)[0];
            if (firstAnimation) {
                this.playAnimation(firstAnimation);
                console.log('Started animation:', firstAnimation);
            }
            
            this.scene.add(this.character);
            console.log('Character loaded successfully');
            
        } catch (error) {
            console.error('Error loading character:', error);
        }
    }
    
    setupAudio() {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.dataArray = new Float32Array(bufferLength);
        
        console.log('Audio context created, analyser ready');
    }
    
    setupControls() {
        const audioFileInput = document.getElementById('audioFile');
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        audioFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name);
                this.loadAudioFile(file);
            }
        });
        
        playBtn.addEventListener('click', () => {
            if (this.audioElement) {
                this.audioElement.play();
                console.log('Audio playback started');
            } else {
                console.warn('No audio loaded');
            }
        });
        
        pauseBtn.addEventListener('click', () => {
            if (this.audioElement) {
                this.audioElement.pause();
                console.log('Audio playback paused');
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
    
    playAnimation(animationName, fadeTime = 0.5) {
        if (!this.animations[animationName]) {
            console.warn(`Animation ${animationName} not found`);
            return;
        }
        
        const newAction = this.animations[animationName];
        
        if (this.currentAction && this.currentAction !== newAction) {
            this.currentAction.fadeOut(fadeTime);
        }
        
        newAction.reset().fadeIn(fadeTime).play();
        this.currentAction = newAction;
    }
    
    analyzeAudio() {
        if (!this.analyser || !this.audioElement || this.audioElement.paused) {
            return {
                bassLevel: 0,
                snareLevel: 0,
                overallVolume: 0,
                isBeating: false
            };
        }
        
        this.analyser.getByteFrequencyData(this.frequencyData);
        
        // Analyze bass (low frequencies 0-100Hz)
        let bassSum = 0;
        const bassRange = Math.floor(this.frequencyData.length * 0.1);
        for (let i = 0; i < bassRange; i++) {
            bassSum += this.frequencyData[i];
        }
        const bassLevel = (bassSum / bassRange) / 255;
        
        // Analyze snare/hi-hat (mid-high frequencies)
        let snareSum = 0;
        const snareStart = Math.floor(this.frequencyData.length * 0.3);
        const snareEnd = Math.floor(this.frequencyData.length * 0.6);
        for (let i = snareStart; i < snareEnd; i++) {
            snareSum += this.frequencyData[i];
        }
        const snareLevel = (snareSum / (snareEnd - snareStart)) / 255;
        
        // Overall volume
        let totalSum = 0;
        for (let i = 0; i < this.frequencyData.length; i++) {
            totalSum += this.frequencyData[i];
        }
        const overallVolume = (totalSum / this.frequencyData.length) / 255;
        
        // Improved beat detection with lower thresholds
        const currentTime = Date.now();
        const isBeating = (bassLevel > 0.3 || snareLevel > 0.3) && 
                         (currentTime - this.lastBeatTime > 200); // Reduced to 200ms
        
        if (isBeating) {
            this.lastBeatTime = currentTime;
        }
        
        // Update UI with more detailed info
        document.getElementById('bassLevel').textContent = (bassLevel * 100).toFixed(1) + '%';
        document.getElementById('beatStatus').textContent = isBeating ? 'BEAT!' : 'quiet';
        
        // Debug logging
        if (overallVolume > 0.1) {
            console.log('Audio levels:', {
                bass: (bassLevel * 100).toFixed(1) + '%',
                snare: (snareLevel * 100).toFixed(1) + '%',
                overall: (overallVolume * 100).toFixed(1) + '%',
                isBeating: isBeating
            });
        }
        
        return {
            bassLevel,
            snareLevel,
            overallVolume,
            isBeating
        };
    }
    
    updateDanceMovements(audioData) {
        if (!this.character) return;
        
        const { bassLevel, snareLevel, overallVolume, isBeating } = audioData;
        
        // Get available animations
        const availableAnimations = Object.keys(this.animations);
        console.log('Available animations:', availableAnimations);
        
        // Simple animation switching based on audio levels
        let targetAnimation = availableAnimations[0]; // Default to first animation
        
        if (availableAnimations.length > 1) {
            if (isBeating && bassLevel > 0.5) {
                // High energy - use second animation if available
                targetAnimation = availableAnimations[1] || availableAnimations[0];
            } else if (overallVolume > 0.2) {
                // Medium energy - use first animation
                targetAnimation = availableAnimations[0];
            }
        }
        
        // Play the target animation
        if (targetAnimation && this.animations[targetAnimation]) {
            this.playAnimation(targetAnimation);
        }
        
        // Additional reactive movements
        if (isBeating) {
            // Pulse the character scale slightly
            const scale = 1 + (bassLevel * 0.1);
            this.character.scale.set(scale, scale, scale);
            
            // Rotate lights for disco effect
            const time = Date.now() * 0.001;
            this.scene.children.forEach((child) => {
                if (child instanceof THREE.PointLight) {
                    child.intensity = 1 + (bassLevel * 2);
                    child.position.x = Math.sin(time + child.id) * 10;
                    child.position.z = Math.cos(time + child.id) * 10;
                }
            });
        } else {
            // Return to normal scale
            this.character.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = 0.016; // ~60fps
        
        // Update animation mixer with proper delta time
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Analyze audio and update dance
        const audioData = this.analyzeAudio();
        this.updateDanceMovements(audioData);
        
        // Camera movement for dynamic feel
        const time = Date.now() * 0.001;
        this.camera.position.x = Math.sin(time * 0.5) * 1;
        this.camera.position.y = 2 + Math.sin(time * 0.3) * 0.5;
        this.camera.lookAt(0, 1, 0);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DancingGirlApp();
    
    // Handle audio context restrictions
    document.addEventListener('click', () => {
        if (app.audioContext && app.audioContext.state === 'suspended') {
            app.audioContext.resume();
        }
    }, { once: true });
}); 