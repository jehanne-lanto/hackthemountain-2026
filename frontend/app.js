// Sélection des éléments de l'interface
const video = document.getElementById('camera-stream');
const canvas = document.getElementById('snapshot-canvas');
const captureBtn = document.getElementById('capture-btn');
const statusText = document.getElementById('status-text');
const audioPanel = document.getElementById('audio-panel');

// 1. Allumer la caméra
async function startCamera() {
    try {
        // On demande la vidéo, en privilégiant la caméra arrière (environment) sur mobile
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        video.srcObject = stream;
        statusText.innerText = "Caméra prête. Pointez une œuvre !";
    } catch (err) {
        console.error("Erreur d'accès à la caméra :", err);
        statusText.innerText = "Erreur : Autorisez l'accès à la caméra.";
    }
}

// 2. Capturer l'image et l'envoyer à FastAPI
async function captureAndAnalyze() {
    // Étape A : Régler la taille du canvas sur celle de la vidéo et dessiner l'image
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Étape B : Convertir le canvas en fichier image (Blob)
    canvas.toBlob(async (blob) => {
        statusText.innerText = "Analyse en cours par l'IA... 🧠";
        captureBtn.disabled = true; // On bloque le bouton pendant l'envoi

        // On emballe l'image comme si c'était un formulaire HTML classique
        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
            // Étape C : Envoi de la requête POST vers ton API Python locale
            const response = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Le serveur FastAPI a renvoyé une erreur.");

            // Étape D : Récupération du JSON de PyTorch !
            const audioParams = await response.json();
            
            console.log("Victoire ! Paramètres reçus :", audioParams);
            statusText.innerText = "Analyse terminée !";

            // On cache le bouton d'analyse et on affiche les contrôles audio
            captureBtn.classList.add("hidden");
            audioPanel.classList.remove("hidden");

            // TODO: On connectera la Web Audio API ici à la prochaine étape !
            // setupAudio(audioParams);

        } catch (err) {
            console.error("Erreur API :", err);
            statusText.innerText = "Erreur de connexion au serveur.";
        } finally {
            captureBtn.disabled = false;
        }

    }, 'image/jpeg', 0.8); // Format JPEG avec une légère compression pour aller vite
}

// 3. Lancer la machine
startCamera();
captureBtn.addEventListener('click', captureAndAnalyze);