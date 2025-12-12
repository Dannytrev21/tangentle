/**
 * Gemini AI Service for Executive Brain
 * Handles all communication with Google's Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class GeminiService {
    constructor() {
        this.client = null;
        this.model = null;
        this.enabled = false;
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes

        this._initialize();
    }

    _initialize() {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
            console.warn('[Gemini] API key not configured. Gemini features disabled.');
            console.warn('[Gemini] Set GEMINI_API_KEY in .env to enable.');
            this.enabled = false;
            return;
        }

        try {
            this.client = new GoogleGenerativeAI(apiKey);
            this.model = this.client.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                }
            });
            this.enabled = true;
            console.log('[Gemini] Service initialized successfully');
        } catch (error) {
            console.error('[Gemini] Failed to initialize:', error.message);
            this.enabled = false;
        }
    }

    /**
     * Check if Gemini service is available
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Generate a cache key from input
     */
    _getCacheKey(prompt, options = {}) {
        const content = JSON.stringify({ prompt: prompt.substring(0, 500), options });
        // Simple hash
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `gemini_${hash}`;
    }

    /**
     * Check cache for existing response
     */
    _checkCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            console.log('[Gemini] Cache hit');
            return cached.response;
        }
        if (cached) {
            this.cache.delete(key); // Clear expired
        }
        return null;
    }

    /**
     * Store response in cache
     */
    _setCache(key, response) {
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });

        // Prune old entries if cache gets too large
        if (this.cache.size > 100) {
            const oldest = this.cache.keys().next().value;
            this.cache.delete(oldest);
        }
    }

    /**
     * Generate text response from Gemini
     * @param {string} prompt - The prompt to send
     * @param {object} options - Optional configuration
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        if (!this.enabled) {
            throw new Error('Gemini service not enabled. Check API key configuration.');
        }

        const { useCache = true, retries = 1 } = options;

        // Check cache
        if (useCache) {
            const cacheKey = this._getCacheKey(prompt, options);
            const cached = this._checkCache(cacheKey);
            if (cached) {
                return cached;
            }
        }

        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                console.log(`[Gemini] Generating response (attempt ${attempt + 1}/${retries + 1})`);
                const startTime = Date.now();

                const result = await this.model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                const elapsed = Date.now() - startTime;
                console.log(`[Gemini] Response generated in ${elapsed}ms`);

                // Cache the response
                if (useCache) {
                    const cacheKey = this._getCacheKey(prompt, options);
                    this._setCache(cacheKey, text);
                }

                return text;
            } catch (error) {
                lastError = error;
                console.error(`[Gemini] Error (attempt ${attempt + 1}):`, error.message);

                // Don't retry on certain errors
                if (error.message.includes('API key') || error.message.includes('quota')) {
                    break;
                }

                // Wait before retry
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                }
            }
        }

        throw lastError;
    }

    /**
     * Generate JSON response from Gemini
     * Ensures output is valid JSON
     * @param {string} prompt - The prompt (should request JSON output)
     * @param {object} options - Optional configuration
     * @returns {Promise<object>} Parsed JSON response
     */
    async generateJSON(prompt, options = {}) {
        // Append JSON instruction if not present
        let jsonPrompt = prompt;
        if (!prompt.includes('JSON') && !prompt.includes('json')) {
            jsonPrompt += '\n\nRespond with valid JSON only. No markdown code blocks.';
        }

        const response = await this.generate(jsonPrompt, options);

        // Clean response - remove markdown code blocks if present
        let cleanedResponse = response.trim();

        // Log raw response length for debugging
        console.log(`[Gemini] Raw response length: ${response.length} chars`);

        // Remove markdown code blocks
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.slice(7);
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.slice(3);
        }
        if (cleanedResponse.endsWith('```')) {
            cleanedResponse = cleanedResponse.slice(0, -3);
        }
        cleanedResponse = cleanedResponse.trim();

        // Try to parse the JSON
        try {
            return JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('[Gemini] Initial JSON parse failed:', parseError.message);
            console.error('[Gemini] Response preview:', cleanedResponse.substring(0, 500));
            console.error('[Gemini] Response end:', cleanedResponse.substring(cleanedResponse.length - 200));

            // Attempt to repair common JSON issues
            const repairedResponse = this._attemptJSONRepair(cleanedResponse);
            if (repairedResponse) {
                try {
                    const parsed = JSON.parse(repairedResponse);
                    console.log('[Gemini] JSON repair successful');
                    return parsed;
                } catch (repairError) {
                    console.error('[Gemini] JSON repair also failed:', repairError.message);
                }
            }

            throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
        }
    }

    /**
     * Attempt to repair common JSON issues from truncated or malformed responses
     * @param {string} json - The malformed JSON string
     * @returns {string|null} Repaired JSON or null if repair not possible
     */
    _attemptJSONRepair(json) {
        if (!json || json.length === 0) {
            return null;
        }

        let repaired = json;

        // Remove any trailing incomplete strings or values
        // Look for the last complete property

        // Count brackets to find imbalance
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        let lastValidIndex = 0;

        for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') {
                    braceCount--;
                    if (braceCount >= 0) lastValidIndex = i;
                }
                else if (char === '[') bracketCount++;
                else if (char === ']') {
                    bracketCount--;
                    if (bracketCount >= 0) lastValidIndex = i;
                }
            }
        }

        // If we're in an unclosed string, try to close it
        if (inString) {
            // Find the last quote and truncate there, then close
            const lastQuote = repaired.lastIndexOf('"');
            if (lastQuote > 0) {
                repaired = repaired.substring(0, lastQuote + 1);
            }
        }

        // Close any unclosed brackets/braces
        // Recount after potential string fix
        braceCount = 0;
        bracketCount = 0;
        inString = false;
        escapeNext = false;

        for (let i = 0; i < repaired.length; i++) {
            const char = repaired[i];
            if (escapeNext) { escapeNext = false; continue; }
            if (char === '\\') { escapeNext = true; continue; }
            if (char === '"' && !escapeNext) { inString = !inString; continue; }
            if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                else if (char === '[') bracketCount++;
                else if (char === ']') bracketCount--;
            }
        }

        // Remove trailing comma before closing
        repaired = repaired.replace(/,\s*$/, '');

        // Add missing closing brackets/braces
        while (bracketCount > 0) {
            repaired += ']';
            bracketCount--;
        }
        while (braceCount > 0) {
            repaired += '}';
            braceCount--;
        }

        console.log(`[Gemini] Repair attempt: added ${braceCount} braces, ${bracketCount} brackets`);

        return repaired;
    }

    /**
     * Test the connection to Gemini
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.enabled) {
            return false;
        }

        try {
            const response = await this.generate('Say "ok" and nothing else.', {
                useCache: false,
                retries: 0
            });
            return response.toLowerCase().includes('ok');
        } catch (error) {
            console.error('[Gemini] Connection test failed:', error.message);
            return false;
        }
    }
}

// Export singleton instance
module.exports = new GeminiService();
