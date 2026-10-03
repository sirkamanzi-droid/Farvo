import torch
from transformers import AutoModelForImageClassification, AutoImageProcessor

MODEL_ID = "omaralshareef/beans-image-classifier"
OUTPUT_PATH = "beans_model.onnx"

print("Downloading model...")
model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
processor = AutoImageProcessor.from_pretrained(MODEL_ID)
model.eval()

print("Model labels (confirm these match what we expect):")
print(model.config.id2label)

dummy_input = torch.randn(1, 3, 224, 224)

print("Exporting to ONNX...")
torch.onnx.export(
    model,
    dummy_input,
    OUTPUT_PATH,
    input_names=["input"],
    output_names=["logits"],
    dynamic_axes={"input": {0: "batch_size"}, "logits": {0: "batch_size"}},
    opset_version=14,
)

print(f"Done. Saved to {OUTPUT_PATH}")

import onnxruntime as ort
import numpy as np

session = ort.InferenceSession(OUTPUT_PATH)
test_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
outputs = session.run(None, {"input": test_input})
print("Sanity check output shape:", outputs[0].shape)
print("If this printed a shape like (1, 3), the conversion worked.")
