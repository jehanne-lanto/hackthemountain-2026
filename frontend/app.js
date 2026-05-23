// ==========================================
// 1. SÉLECTION DES ÉLÉMENTS DU DOM
// ==========================================
const video = document.getElementById('camera-stream');
const canvas = document.getElementById('snapshot-canvas');
const captureBtn = document.getElementById('capture-btn');
const statusText = document.getElementById('status-text');
const audioPanel = document.getElementById('audio-panel');
const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');


// ==========================================
// 2. GESTION DE LA CAMÉRA & ANALYSE
// ==========================================
let currentAudioParams = null;

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
        statusText.innerText = "Caméra prête. Pointez une œuvre d'art !";
    } catch (err) {
        console.error("Erreur d'accès à la caméra :", err);
        statusText.innerText = "Erreur : Autorisez l'accès à la caméra du navigateur.";
    }
}

async function captureAndAnalyze() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
        statusText.innerText = "Analyse en cours par le ResNet... 🧠";
        captureBtn.disabled = true;

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            const response = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Le serveur FastAPI a renvoyé une erreur.");

            currentAudioParams = await response.json();
            
            console.log("Victoire ! JSON reçu :", currentAudioParams);
            statusText.innerText = "Analyse terminée ! Appuyez sur Jouer.";

            captureBtn.classList.add("hidden");
            audioPanel.classList.remove("hidden");

        } catch (err) {
            console.error("Erreur API :", err);
            statusText.innerText = "Erreur : Le serveur FastAPI (Port 8000) est-il allumé ?";
        } finally {
            captureBtn.disabled = false;
        }

    }, 'image/jpeg', 0.8);
}


// ==========================================
// 3. MOTEUR AUDIO (WEB AUDIO API)
// ==========================================
let audioCtx;
let oscillators = [];
let masterGain;

// Gamme pentatonique mineure (en Hertz)
const scale = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16];

function playSound() {
    if (!currentAudioParams) return;
    const params = currentAudioParams;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    stopSound();

    // -- VOLUME MASTER --
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;

    // -- REVERB simulé avec un délai --
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.3;
    const delayGain = audioCtx.createGain();
    delayGain.gain.value = 0.3;
    delay.connect(delayGain);
    delayGain.connect(masterGain);

    // -- FILTRE (piloté par la luminosité) --
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300 + (params.brightness * 2700);

    // Câblage : filtre → master + filtre → delay
    filter.connect(masterGain);
    filter.connect(delay);
    masterGain.connect(audioCtx.destination);

    // -- GÉNÉRATION DES NOTES --
    const rootIndex = Math.floor(params.harmony * 5);
    const chordIntervals = [0, 2, 4];
    const waveTypes = ['sine', 'triangle', 'sawtooth', 'square'];
    const waveIndex = Math.floor(params.texture * 3.99);

    chordIntervals.forEach((interval, i) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = waveTypes[waveIndex];
        osc.frequency.value = scale[rootIndex + interval];

        // Detune unique par oscillateur
        osc.detune.value = (params.param_5 - 0.5) * 50 + (i * 7);

        // Décalage dans le temps → effet arpège
        const startTime = audioCtx.currentTime + i * 0.45;

        // Enveloppe ADSR
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.3);
        gainNode.gain.linearRampToValueAtTime(0.12, startTime + 1.2);
        gainNode.gain.setValueAtTime(0.12, startTime + 2.5);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 4.5);

        osc.connect(gainNode);
        gainNode.connect(filter);

        osc.start(startTime);
        osc.stop(startTime + 4.5);

        oscillators.push(osc);
    });
}

function stopSound() {
    oscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    oscillators = [];
}


// ==========================================
// 4. ÉCOUTEURS D'ÉVÉNEMENTS
// ==========================================
captureBtn.addEventListener('click', captureAndAnalyze);
playBtn.addEventListener('click', playSound);
stopBtn.addEventListener('click', stopSound);

startCamera();