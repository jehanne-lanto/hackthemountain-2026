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