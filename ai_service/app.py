import os
import torch
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Hugging Face Configuration
HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_NAME = os.getenv("MODEL_NAME", "google/gemma-2b-it") # Or specific MedGemma name

if not HF_TOKEN:
    print("Warning: HF_TOKEN is not set in .env file. Access to gated models will fail.")

print(f"Loading Model: {MODEL_NAME}...")

# Optionally configure device mapping. For now, try to load on CUDA if available.
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, 
        token=HF_TOKEN, 
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map="auto" if device == "cuda" else None
    )
    if device == "cpu":
        model.to(device)
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    # Initialize as None so the server can start and return errors on endpoint
    tokenizer = None
    model = None

@app.route('/analyze-report', methods=['POST'])
def analyze_report():
    if not model or not tokenizer:
        return jsonify({"error": "Model failed to load. Please check logs and HF_TOKEN."}), 500

    data = request.json
    report_text = data.get("report_text", "")
    
    if not report_text:
        return jsonify({"error": "No report_text provided."}), 400

    prompt = f"Analyze the following medical lab report:\n\n{report_text}\n\nProvide an analysis of the key findings, potential health implications, and recommendations. (Note: This is an AI analysis and not a substitute for professional medical advice.):\n"
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        outputs = model.generate(
            **inputs, 
            max_new_tokens=512, 
            temperature=0.3, 
            top_kp=0.9
        )
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Remove the prompt from the response if present (Gemma specific handling might be needed but simple decoding usually suffices)
        analysis = response_text[len(prompt):] if response_text.startswith(prompt) else response_text
        
        return jsonify({"analysis": analysis.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "running", 
        "model_loaded": model is not None,
        "device": device
    })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
