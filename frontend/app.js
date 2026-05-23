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

// Variable pour stocker les prédictions du réseau de neurones
let currentAudioParams = null; 

async function startCamera() {
    try {
        // Demande la caméra arrière en priorité pour les mobiles
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
    // A. Régler la taille du canvas sur celle de la vidéo et "prendre la photo"
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // B. Extraire l'image du canvas sous forme de fichier JPEG (Blob)
    canvas.toBlob(async (blob) => {
        statusText.innerText = "Analyse en cours par le ResNet... 🧠";
        captureBtn.disabled = true;

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            // C. Appel à l'API PyTorch locale
            const response = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Le serveur FastAPI a renvoyé une erreur.");

            // D. Récupération des 10 paramètres 
            currentAudioParams = await response.json();
            
            console.log("Victoire ! JSON reçu :", currentAudioParams);
            statusText.innerText = "Analyse terminée ! Appuyez sur Jouer.";

            // E. Mise à jour de l'interface
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

    // Initialisation forcée après interaction utilisateur (sécurité navigateur)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    stopSound(); // Nettoie avant de rejouer
    
    // -- CONTRÔLE DU VOLUME --
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    
    // -- LE FILTRE (Piloté par la luminosité : param[2]) --
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    // Mapping: luminosité (0-1) => Fréquence de coupure (300Hz à 3000Hz)
    filter.frequency.value = 300 + (params.brightness * 2700);
    
    // Câblage final vers les haut-parleurs
    filter.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // -- LA GÉNÉRATION DES NOTES (Pilotée par l'harmonie et la texture) --
    // Index de la note fondamentale dans la gamme (param[0])
    const rootIndex = Math.floor(params.harmony * 5); 
    const chordIntervals = [0, 2, 4]; // Création d'un accord de 3 notes
    
    chordIntervals.forEach((interval) => {
        const osc = audioCtx.createOscillator();
        
        // Choix de la forme d'onde selon la texture de l'image (param[1])
        const waveTypes = ['sine', 'triangle', 'sawtooth', 'square'];
        const waveIndex = Math.floor(params.texture * 3.99); 
        osc.type = waveTypes[waveIndex];
        
        // Fréquence musicale basée sur la gamme
        osc.frequency.value = scale[rootIndex + interval];
        
        // Désaccordage léger pour l'épaisseur du son (param_5)
        osc.detune.value = (params.param_5 - 0.5) * 50; 
        
        // Câblage de l'oscillateur au filtre
        osc.connect(filter);
        osc.start();
        
        oscillators.push(osc); 
    });
}

function stopSound() {
    // Arrêt propre de tous les générateurs de son en cours
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

// Démarrage automatique de la caméra au chargement
startCamera();