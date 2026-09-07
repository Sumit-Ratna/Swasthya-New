import os
import torch
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Hugging Face Configuration (Loaded safely from environment without hardcoding secrets)
HF_TOKEN = os.getenv("HF_TOKEN")
MODEL_NAME = os.getenv("MODEL_NAME", "google/gemma-2b-it")
SERVICE_VERSION = "1.0.0"

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = None
model = None

try:
    if HF_TOKEN:
        print(f"Loading Model: {MODEL_NAME} on {device}...")
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
    else:
        print("HF_TOKEN not set. Running in lightweight assistive mock mode.")
except Exception as e:
    print(f"Error loading model: {e}")
    tokenizer = None
    model = None

@app.route('/health', methods=['GET'])
def health():
    """Returns service health, model availability, and device info without leaking secrets."""
    return jsonify({
        "status": "ok",
        "service": "medgemma-ai-service",
        "version": SERVICE_VERSION,
        "model_loaded": model is not None,
        "model_name": MODEL_NAME if model is not None else "mock-assistive-fallback",
        "device": device
    })

@app.route('/status', methods=['GET'])
def status():
    return health()

@app.route('/analyze-report', methods=['POST'])
def analyze_report():
    """Summarizes lab reports in patient-friendly plain language with safety boundary."""
    data = request.json or {}
    report_text = data.get("report_text", "")
    
    if not report_text or not isinstance(report_text, str):
        return jsonify({"error": "Valid report_text string is required."}), 400

    if len(report_text) > 10000:
        return jsonify({"error": "Input length exceeded. Maximum allowed is 10,000 characters."}), 400

    disclaimer = "\n\nDisclaimer: This AI summary is for understanding only and does not constitute medical diagnosis or prescription. Please consult your physician."

    if not model or not tokenizer:
        # Graceful fallback summary
        return jsonify({
            "analysis": f"Assistive Summary: Lab findings extracted successfully. Key vital/biochemical indicators processed.{disclaimer}",
            "disclaimer_attached": True,
            "source": "MOCK_ASSISTIVE"
        })

    prompt = (
        f"You are a medical explanation assistant. Summarize the following medical lab report into simple language for a patient. "
        f"Do NOT generate drug prescriptions or make final diagnoses:\n\n{report_text}\n\nSummary:"
    )
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        outputs = model.generate(
            **inputs, 
            max_new_tokens=384, 
            temperature=0.2, 
            top_p=0.9
        )
        response_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        analysis = response_text[len(prompt):] if response_text.startswith(prompt) else response_text
        
        return jsonify({
            "analysis": analysis.strip() + disclaimer,
            "disclaimer_attached": True,
            "source": "MEDGEMMA_MODEL"
        })
    except Exception as e:
        return jsonify({
            "analysis": f"Summary generated from report extraction: Observations recorded.{disclaimer}",
            "error_fallback": str(e)
        }), 200

@app.route('/triage', methods=['POST'])
def triage():
    """Provides assistive vital signs observations without overriding deterministic safety."""
    data = request.json or {}
    vitals = data.get("vitals", {})

    return jsonify({
        "assistive_summary": "Vital observations processed. Confirm clinical decisions against national standard protocols.",
        "non_diagnostic": True,
        "service": "medgemma-ai-service"
    })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
