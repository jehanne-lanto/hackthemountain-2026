import torch
import torch.nn as nn
import torchvision.models as models

class ImageToSoundResNet(nn.Module):
    def __init__(self, num_audio_params=10):
        super(ImageToSoundResNet, self).__init__()
        resnet = models.resnet34(weights=models.ResNet34_Weights.DEFAULT)
        
        self.features = nn.Sequential(*list(resnet.children())[:-1])
        
        self.audio_projection = nn.Sequential(
            nn.Flatten(),
            nn.Linear(resnet.fc.in_features, num_audio_params),
            nn.Sigmoid()
        )

    def forward(self, x):
        x = self.features(x)
        audio_params = self.audio_projection(x)
        return audio_params

import torchvision.transforms as transforms
from PIL import Image

# Preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# La fonction que tout le monde va appeler
def analyze_image(image_path: str) -> dict:
    model = ImageToSoundResNet()
    model.eval()

    img = Image.open(image_path).convert("RGB")
    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        params = model(tensor).squeeze().tolist()

    return {
        "harmony_base":    params[0],
        "harmony_mid":     params[1],
        "harmony_high":    params[2],
        "texture_density": params[3],
        "brightness":      params[4],
        "filter_cutoff":   params[5],
        "filter_resonance":params[6],
        "reverb":          params[7],
        "delay":           params[8],
        "complexity":      params[9],
    }