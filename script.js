// SillyTavern Metronome Extension
// Version 1.0.0

(function() {
    'use strict';

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const state = {
        isPlaying: false,
        bpm: 120,
        beatsPerBar: 4,
        currentBeat: 1,
        nextNoteTime: 0,
        timerID: null,
        volume: 0.5,
        tapTimestamps: [],
        lastTapTime: 0,
        tapTimeoutID: null,
        audioContext: null,
        gainNode: null
    };

    // ============================================
    // DOM ELEMENTS
    // ============================================
    let elements = {};

    // ============================================
    // AUDIO SYSTEM
    // ============================================
    
    /**
     * Initialize Web Audio API
     */
    function initAudio() {
        if (!state.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            state.audioContext = new AudioContext();
            
            // Create gain node for volume control
            state.gainNode = state.audioContext.createGain();
            state.gainNode.connect(state.audioContext.destination);
            state.gainNode.gain.value = state.volume;
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }
    }

    /**
     * Generate a click sound using Web Audio API
     * @param {number} time - When to play the sound
     * @param {boolean} isDownbeat - Whether this is the first beat of the bar
     */
    function playClick(time, isDownbeat) {
        if (!state.audioContext || !state.gainNode) {
            return;
        }

        const oscillator = state.audioContext.createOscillator();
        const gainNode = state.audioContext.createGain();

        // Different pitch for downbeat vs. other beats
        oscillator.frequency.value = isDownbeat ? 880 : 440; // A5 for downbeat, A4 for others
        oscillator.type = 'sine';

        // Connect oscillator to gain node, then to master gain
        oscillator.connect(gainNode);
        gainNode.connect(state.gainNode);

        // Envelope to prevent clicking
        const attackTime = 0.005;
        const decayTime = 0.01;
        const sustainLevel = 0.8;
        const releaseTime = 0.02;
        const duration = isDownbeat ? 0.1 : 0.05;

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(1, time + attackTime);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, time + attackTime + decayTime);
        gainNode.gain.linearRampToValueAtTime(0, time + duration);

        oscillator.start(time);
        oscillator.stop(time + duration + releaseTime);
    }

    // ============================================
    // METRONOME TIMING ENGINE
    // ============================================

    const lookahead = 25.0; // milliseconds
    const scheduleAheadTime = 0.1; // seconds

    /**
     * Schedule the next note
     */
    function nextNote() {
        const secondsPerBeat = 60.0 / state.bpm;
        state.nextNoteTime += secondsPerBeat;
        
        // Advance beat counter
        state.currentBeat++;
        if (state.currentBeat > state.beatsPerBar) {
            state.currentBeat = 1;
        }
    }

    /**
     * Schedule notes ahead of time
     */
    function scheduleNote(beatNumber, time) {
        // Play audio
        const isDownbeat = beatNumber === 1;
        playClick(time, isDownbeat);

        // Update visual indicator
        requestAnimationFrame(() => {
            updateBeatIndicator(beatNumber);
        });
    }

    /**
     * Main scheduling loop
     */
    function scheduler() {
        while (state.nextNoteTime < state.audioContext.currentTime + scheduleAheadTime) {
            scheduleNote(state.currentBeat, state.nextNoteTime);
            nextNote();
        }
        
        if (state.isPlaying) {
            state.timerID = setTimeout(scheduler, lookahead);
        }
    }

    /**
     * Start the metronome
     */
    function startMetronome() {
        if (state.isPlaying) {
            return;
        }

        initAudio();
        state.isPlaying = true;
        state.currentBeat = 1;
        state.nextNoteTime = state.audioContext.currentTime + 0.05;
        
        scheduler();
        updateUI();
        saveSettings();
        console.log('[Metronome] Started at', state.bpm, 'BPM, time signature:', state.beatsPerBar + '/4');
    }

    /**
     * Stop the metronome
     */
    function stopMetronome() {
        if (!state.isPlaying) {
            return;
        }

        state.isPlaying = false;
        
        if (state.timerID) {
            clearTimeout(state.timerID);
            state.timerID = null;
        }
        
        state.currentBeat = 1;
        updateUI();
        saveSettings();
        console.log('[Metronome] Stopped');
    }

    /**
     * Toggle metronome on/off
     */
    function toggleMetronome() {
        if (state.isPlaying) {
            stopMetronome();
        } else {
            startMetronome();
        }
    }

    // ============================================
    // TAP TEMPO FEATURE
    // ============================================

    /**
     * Handle tap tempo button click
     */
    function handleTapTempo() {
        const now = Date.now();
        
        // Clear previous timeout
        if (state.tapTimeoutID) {
            clearTimeout(state.tapTimeoutID);
        }
        
        // Add tap timestamp
        state.tapTimestamps.push(now);
        
        // Keep only last 4 taps
        if (state.tapTimestamps.length > 4) {
            state.tapTimestamps.shift();
        }
        
        // Visual feedback
        elements.tapTempoButton.classList.add('tapping');
        setTimeout(() => {
            elements.tapTempoButton.classList.remove('tapping');
        }, 200);
        
        // Calculate BPM if we have at least 2 taps
        if (state.tapTimestamps.length >= 2) {
            const intervals = [];
            for (let i = 1; i < state.tapTimestamps.length; i++) {
                intervals.push(state.tapTimestamps[i] - state.tapTimestamps[i - 1]);
            }
            
            const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBPM = Math.round(60000 / averageInterval);
            
            // Validate BPM range
            const validBPM = Math.max(20, Math.min(240, calculatedBPM));
            
            setBPM(validBPM);
            console.log('[Metronome] Tap tempo calculated:', validBPM, 'BPM');
        }
        
        // Reset tap buffer after 2 seconds of inactivity
        state.tapTimeoutID = setTimeout(() => {
            state.tapTimestamps = [];
        }, 2000);
    }

    // ============================================
    // VOLUME CONTROL
    // ============================================

    /**
     * Set volume
     * @param {number} volume - Volume value (0-100)
     */
    function setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        state.volume = clampedVolume / 100;
        
        if (state.gainNode) {
            state.gainNode.gain.value = state.volume;
        }
        
        updateUI();
        saveSettings();
    }

    // ============================================
    // BPM CONTROL
    // ============================================

    /**
     * Set BPM
     * @param {number} bpm - Beats per minute (20-240)
     */
    function setBPM(bpm) {
        const clampedBPM = Math.max(20, Math.min(240, bpm));
        state.bpm = clampedBPM;
        updateUI();
        saveSettings();
    }

    // ============================================
    // TIME SIGNATURE CONTROL
    // ============================================

    /**
     * Set time signature
     * @param {number} beats - Beats per bar
     */
    function setTimeSignature(beats) {
        state.beatsPerBar = beats;
        state.currentBeat = 1;
        updateUI();
        saveSettings();
        console.log('[Metronome] Time signature set to:', beats + '/4');
    }

    // ============================================
    // UI UPDATES
    // ============================================

    /**
     * Update beat indicator
     * @param {number} beatNumber - Current beat number
     */
    function updateBeatIndicator(beatNumber) {
        const dots = elements.beatIndicator.querySelectorAll('.beat-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'pulse');
            if (index + 1 === beatNumber) {
                dot.classList.add('active', 'pulse');
            }
        });
    }

    /**
     * Update all UI elements
     */
    function updateUI() {
        // Update status
        elements.status.textContent = state.isPlaying ? 'RUNNING' : 'STOPPED';
        elements.status.className = 'metronome-status ' + (state.isPlaying ? 'running' : 'stopped');
        
        // Update start/stop button
        elements.startStopButton.textContent = state.isPlaying ? 'STOP' : 'START';
        elements.startStopButton.className = 'start-stop-button ' + (state.isPlaying ? 'running' : 'stopped');
        
        // Update BPM controls
        elements.bpmSlider.value = state.bpm;
        elements.bpmInput.value = state.bpm;
        
        // Update time signature
        elements.timeSignatureSelect.value = state.beatsPerBar + '/4';
        
        // Update volume
        elements.volumeSlider.value = state.volume * 100;
        elements.volumeValue.textContent = Math.round(state.volume * 100) + '%';
        
        // Update info display
        elements.infoBpm.textContent = state.bpm + ' BPM';
        elements.infoTimeSignature.textContent = state.beatsPerBar + '/4';
        
        // Update beat indicator
        updateBeatIndicator(state.currentBeat);
    }

    /**
     * Create beat indicator dots
     */
    function createBeatIndicator() {
        elements.beatIndicator.innerHTML = '';
        for (let i = 0; i < state.beatsPerBar; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot' + (i === 0 ? ' downbeat' : '');
            elements.beatIndicator.appendChild(dot);
        }
    }

    // ============================================
    // LLM COMMAND PARSER
    // ============================================

    /**
     * Parse and execute LLM commands
     * @param {string} message - The message to parse
     */
    function parseCommands(message) {
        if (!message) {
            return;
        }

        // Command patterns
        const patterns = {
            start: /\[METRONOME:\s*START\]/i,
            stop: /\[METRONOME:\s*STOP\]/i,
            bpm: /\[METRONOME:\s*BPM\s*(\d+)\]/i,
            time: /\[METRONOME:\s*TIME\s*(\d+)\]/i,
            volume: /\[METRONOME:\s*VOLUME\s*(\d+)\]/i
        };

        // Check for START command
        if (patterns.start.test(message)) {
            startMetronome();
            console.log('[Metronome] LLM command: START');
        }

        // Check for STOP command
        if (patterns.stop.test(message)) {
            stopMetronome();
            console.log('[Metronome] LLM command: STOP');
        }

        // Check for BPM command
        const bpmMatch = message.match(patterns.bpm);
        if (bpmMatch) {
            const bpm = parseInt(bpmMatch[1], 10);
            setBPM(bpm);
            console.log('[Metronome] LLM command: BPM', bpm);
        }

        // Check for TIME command
        const timeMatch = message.match(patterns.time);
        if (timeMatch) {
            const beats = parseInt(timeMatch[1], 10);
            if (beats >= 1 && beats <= 8) {
                setTimeSignature(beats);
            } else {
                console.warn('[Metronome] Invalid time signature:', beats);
            }
        }

        // Check for VOLUME command
        const volumeMatch = message.match(patterns.volume);
        if (volumeMatch) {
            const volume = parseInt(volumeMatch[1], 10);
            setVolume(volume);
            console.log('[Metronome] LLM command: VOLUME', volume);
        }
    }

    // ============================================
    // SETTINGS PERSISTENCE
    // ============================================

    /**
     * Save settings to extension storage
     */
    function saveSettings() {
        const settings = {
            bpm: state.bpm,
            timeSignature: state.beatsPerBar + '/4',
            volume: Math.round(state.volume * 100)
        };
        
        // Try to save to SillyTavern extension settings
        if (typeof window.extensionSettings !== 'undefined') {
            window.extensionSettings.metronome = settings;
        }
        
        // Also save to localStorage as fallback
        localStorage.setItem('metronomeSettings', JSON.stringify(settings));
    }

    /**
     * Load settings from extension storage
     */
    function loadSettings() {
        let settings = null;
        
        // Try to load from SillyTavern extension settings
        if (typeof window.extensionSettings !== 'undefined' && window.extensionSettings.metronome) {
            settings = window.extensionSettings.metronome;
        }
        
        // Fallback to localStorage
        if (!settings) {
            const saved = localStorage.getItem('metronomeSettings');
            if (saved) {
                try {
                    settings = JSON.parse(saved);
                } catch (e) {
                    console.error('[Metronome] Error loading settings:', e);
                }
            }
        }
        
        // Apply settings
        if (settings) {
            if (settings.bpm) {
                state.bpm = Math.max(20, Math.min(240, settings.bpm));
            }
            if (settings.timeSignature) {
                const beats = parseInt(settings.timeSignature.split('/')[0], 10);
                if (beats >= 1 && beats <= 8) {
                    state.beatsPerBar = beats;
                }
            }
            if (settings.volume !== undefined) {
                state.volume = Math.max(0, Math.min(1, settings.volume / 100));
            }
        }
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Start/Stop button
        elements.startStopButton.addEventListener('click', toggleMetronome);
        
        // BPM slider
        elements.bpmSlider.addEventListener('input', (e) => {
            setBPM(parseInt(e.target.value, 10));
        });
        
        // BPM input
        elements.bpmInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 20 && value <= 240) {
                setBPM(value);
            } else {
                e.target.value = state.bpm;
            }
        });
        
        // Time signature dropdown
        elements.timeSignatureSelect.addEventListener('change', (e) => {
            const beats = parseInt(e.target.value.split('/')[0], 10);
            setTimeSignature(beats);
        });
        
        // Volume slider
        elements.volumeSlider.addEventListener('input', (e) => {
            setVolume(parseInt(e.target.value, 10));
        });
        
        // Tap tempo button
        elements.tapTempoButton.addEventListener('click', handleTapTempo);
        
        // Hook into SillyTavern message events
        if (typeof window.eventSource !== 'undefined') {
            window.eventSource.on('event', (event) => {
                if (event.type === 'message' && event.mes) {
                    parseCommands(event.mes);
                }
            });
        }
        
        // Also try to hook into chat message updates
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const messageText = node.querySelector('.mes_text');
                            if (messageText) {
                                parseCommands(messageText.textContent);
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the chat container
        const chatContainer = document.getElementById('chat');
        if (chatContainer) {
            observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Create UI elements
     */
    function createUI() {
        // Create main container
        const container = document.createElement('div');
        container.className = 'metronome-container';
        
        // Header
        const header = document.createElement('div');
        header.className = 'metronome-header';
        header.innerHTML = `
            <h2 class="metronome-title">🎵 Metronome</h2>
            <span class="metronome-status stopped">STOPPED</span>
        `;
        container.appendChild(header);
        
        // Start/Stop button
        const startStopGroup = document.createElement('div');
        startStopGroup.className = 'control-group';
        startStopGroup.innerHTML = `
            <button class="start-stop-button stopped">START</button>
        `;
        container.appendChild(startStopGroup);
        
        // BPM control
        const bpmGroup = document.createElement('div');
        bpmGroup.className = 'control-group bpm-control';
        bpmGroup.innerHTML = `
            <div class="control-label">
                <span>Tempo (BPM)</span>
                <span class="control-value" id="bpmValue">120</span>
            </div>
            <div class="bpm-slider-container">
                <input type="range" class="bpm-slider" id="bpmSlider" min="20" max="240" value="120">
                <input type="number" class="bpm-input" id="bpmInput" min="20" max="240" value="120">
            </div>
        `;
        container.appendChild(bpmGroup);
        
        // Time signature control
        const timeSignatureGroup = document.createElement('div');
        timeSignatureGroup.className = 'control-group';
        timeSignatureGroup.innerHTML = `
            <div class="control-label">
                <span>Time Signature</span>
            </div>
            <select class="time-signature-select" id="timeSignatureSelect">
                <option value="1/1">1/1</option>
                <option value="2/4">2/4</option>
                <option value="3/4">3/4</option>
                <option value="4/4" selected>4/4</option>
                <option value="6/8">6/8</option>
            </select>
        `;
        container.appendChild(timeSignatureGroup);
        
        // Volume control
        const volumeGroup = document.createElement('div');
        volumeGroup.className = 'control-group volume-control';
        volumeGroup.innerHTML = `
            <div class="control-label">
                <span>Volume</span>
                <span class="control-value" id="volumeValue">50%</span>
            </div>
            <div class="volume-slider-container">
                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="50">
                <span class="volume-value" id="volumeValue">50%</span>
            </div>
        `;
        container.appendChild(volumeGroup);
        
        // Tap tempo button
        const tempoControls = document.createElement('div');
        tempoControls.className = 'tempo-controls';
        tempoControls.innerHTML = `
            <button class="tap-tempo-button" id="tapTempoButton">👆 Tap Tempo</button>
        `;
        container.appendChild(tempoControls);
        
        // Beat indicator
        const beatIndicator = document.createElement('div');
        beatIndicator.className = 'beat-indicator';
        beatIndicator.id = 'beatIndicator';
        container.appendChild(beatIndicator);
        
        // Info display
        const infoDisplay = document.createElement('div');
        infoDisplay.className = 'info-display';
        infoDisplay.innerHTML = `
            <div class="info-item">
                <span class="info-label">BPM</span>
                <span class="info-value" id="infoBpm">120</span>
            </div>
            <div class="info-item">
                <span class="info-label">Time</span>
                <span class="info-value" id="infoTimeSignature">4/4</span>
            </div>
            <div class="info-item">
                <span class="info-label">Volume</span>
                <span class="info-value" id="infoVolume">50%</span>
            </div>
        `;
        container.appendChild(infoDisplay);
        
        // Store element references
        elements = {
            container: container,
            status: header.querySelector('.metronome-status'),
            startStopButton: startStopGroup.querySelector('.start-stop-button'),
            bpmSlider: bpmGroup.querySelector('#bpmSlider'),
            bpmInput: bpmGroup.querySelector('#bpmInput'),
            bpmValue: bpmGroup.querySelector('#bpmValue'),
            timeSignatureSelect: timeSignatureGroup.querySelector('#timeSignatureSelect'),
            volumeSlider: volumeGroup.querySelector('#volumeSlider'),
            volumeValue: volumeGroup.querySelector('#volumeValue'),
            tapTempoButton: tempoControls.querySelector('#tapTempoButton'),
            beatIndicator: beatIndicator,
            infoBpm: infoDisplay.querySelector('#infoBpm'),
            infoTimeSignature: infoDisplay.querySelector('#infoTimeSignature'),
            infoVolume: infoDisplay.querySelector('#infoVolume')
        };
        
        return container;
    }

    /**
     * Initialize the extension
     */
    function init() {
        console.log('[Metronome] Initializing extension...');
        
        // Load saved settings
        loadSettings();
        
        // Create UI
        const ui = createUI();
        
        // Create beat indicator dots
        createBeatIndicator();
        
        // Update UI with loaded settings
        updateUI();
        
        // Setup event listeners
        setupEventListeners();
        
        // Add UI to extension tab
        const extensionContainer = document.getElementById('extensions_settings');
        if (extensionContainer) {
            extensionContainer.appendChild(ui);
            console.log('[Metronome] Extension loaded successfully');
        } else {
            console.error('[Metronome] Extension container not found');
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions globally for debugging
    window.metronomeExtension = {
        start: startMetronome,
        stop: stopMetronome,
        toggle: toggleMetronome,
        setBPM: setBPM,
        setTimeSignature: setTimeSignature,
        setVolume: setVolume,
        getState: () => ({ ...state })
    };

})();