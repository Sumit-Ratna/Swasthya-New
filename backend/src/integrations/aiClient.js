const axios = require('axios');
const config = require('../config/env');

class AiClient {
    constructor() {
        this.baseUrl = config.aiServiceUrl;
        this.timeout = 5000;
    }

    async getTriageScore(vitalsPayload) {
        try {
            const response = await axios.post(`${this.baseUrl}/triage`, vitalsPayload, {
                timeout: this.timeout
            });
            return response.data;
        } catch (error) {
            console.warn('[AI_CLIENT] Python AI service unreachable, returning rule-based triage score:', error.message);
            // Fallback deterministic rule-based triage computation
            let score = 0.2;
            let level = 'LOW';
            if (vitalsPayload.systolic_bp >= 160 || vitalsPayload.spo2 < 90 || vitalsPayload.is_pregnant) {
                score = 0.85;
                level = 'HIGH';
            } else if (vitalsPayload.systolic_bp >= 140 || vitalsPayload.spo2 < 94) {
                score = 0.55;
                level = 'MODERATE';
            }
            return {
                risk_score: score,
                risk_level: level,
                source: 'RULE_BASED_FALLBACK'
            };
        }
    }
}

module.exports = new AiClient();
