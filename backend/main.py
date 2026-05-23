from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np

app = FastAPI(title="Art2Sound API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224))
        pixels = np.array(image) / 255.0  # valeurs entre 0 et 1

        r = pixels[:, :, 0]
        g = pixels[:, :, 1]
        b = pixels[:, :, 2]

        # Luminosité moyenne
        brightness = float(np.mean(pixels))

        # Contraste (écart-type de la luminosité)
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        texture = float(np.std(gray))

        # Température de couleur : chaud (rouge) vs froid (bleu)
        harmony = float(np.mean(r) - np.mean(b) + 0.5)
        harmony = max(0.0, min(1.0, harmony))

        # Saturation moyenne
        max_rgb = np.max(pixels, axis=2)
        min_rgb = np.min(pixels, axis=2)
        saturation = float(np.mean(max_rgb - min_rgb))

        # Dominante verte (calme vs agité)
        green_ratio = float(np.mean(g) / (np.mean(r) + np.mean(g) + np.mean(b) + 1e-5))

        # Complexité visuelle (gradient moyen)
        grad_x = np.abs(np.diff(gray, axis=1)).mean()
        grad_y = np.abs(np.diff(gray, axis=0)).mean()
        complexity = float((grad_x + grad_y) / 2)
        complexity = min(1.0, complexity * 5)

        return {
            "harmony":    round(harmony, 4),
            "texture":    round(min(1.0, texture * 4), 4),
            "brightness": round(brightness, 4),
            "reverb":     round(saturation, 4),
            "param_5":    round(green_ratio * 3, 4),
            "param_6":    round(float(np.mean(b)), 4),
            "param_7":    round(complexity, 4),
            "param_8":    round(float(np.std(r)), 4),
            "param_9":    round(float(np.std(b)), 4),
            "param_10":   round(float(np.mean(max_rgb)), 4),
        }

    except Exception as e:
        return {"error": str(e)}