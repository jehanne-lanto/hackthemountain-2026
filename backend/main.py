from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import torchvision.transforms as transforms
from PIL import Image
import io

# 1. On importe TA classe depuis le fichier model.py
from model import ImageToSoundResNet

app = FastAPI(title="Art2Sound API")

# 2. Configuration CORS : indispensable pour que le front-end web puisse parler à l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En hackathon on ouvre tout, en prod on met l'URL du front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Chargement global du modèle (s'exécute au lancement du serveur)
print("Chargement du modèle PyTorch...")
model = ImageToSoundResNet(num_audio_params=10)
model.eval()

# 4. Pipeline de prétraitement officiel pour ResNet (ImageNet stats)
preprocess = transforms.Compose([
    transforms.Resize(256),          # Redimensionne
    transforms.CenterCrop(224),      # Coupe un carré parfait au centre
    transforms.ToTensor(),           # Transforme en Tenseur PyTorch
    transforms.Normalize(            # Normalise les couleurs
        mean=[0.485, 0.456, 0.406], 
        std=[0.229, 0.224, 0.225]
    ),
])

# 5. La route qui reçoit l'image
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # Lire le fichier envoyé
        image_bytes = await file.read()
        
        # L'ouvrir avec Pillow et forcer le mode RGB (évite les bugs avec les PNG transparents)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Prétraiter l'image (passe de Image PIL à Tenseur)
        input_tensor = preprocess(image)
        
        # Ajouter la dimension du batch : [3, 224, 224] devient [1, 3, 224, 224]
        input_batch = input_tensor.unsqueeze(0)
        
        # Inférence
        with torch.no_grad():
            output = model(input_batch)
            
        # Extraire les 10 valeurs du tenseur
        params = output.squeeze().tolist()
        
        # Renvoie un joli JSON au navigateur web
        return {
            "harmony": params[0],
            "texture": params[1],
            "brightness": params[2],
            "reverb": params[3],
            "param_5": params[4],
            "param_6": params[5],
            "param_7": params[6],
            "param_8": params[7],
            "param_9": params[8],
            "param_10": params[9]
        }
        
    except Exception as e:
        # Toujours utile pour déboguer si une image est corrompue
        return {"error": str(e)}