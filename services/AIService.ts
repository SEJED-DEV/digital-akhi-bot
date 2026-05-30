import axios from 'axios';
import { KeyRingService, APIKey } from './KeyRingService.js';
import { Logger } from './Logger.js';
import { CacheService } from './CacheService.js';
import { SecurityValidator } from './SecurityValidator.js';
import { ResponseFormatter } from './ResponseFormatter.js';
import crypto from 'crypto';

import { EMOJIS } from '../utils/Emojis.js';

export class AIService {
  private keyRing: KeyRingService;

  constructor(keyRing: KeyRingService) {
    this.keyRing = keyRing;
  }

  private normalizeInput(input: string): string {
    return input.trim();
  }

  private sandboxInput(input: string): string {
    return `"""${input}"""`;
  }

  public async generateResponse(
    userInput: string,
    tier: 'Free' | 'Premium' | 'SuperPremium',
    userKey?: { provider: string; key: string },
    onSecurityAlert?: (report: string) => void,
    firstUsedAt?: Date,
    preferredModel?: string,
    userId?: string
  ): Promise<{
    text: string;
    model: string;
    source?: string;
    isHeavy?: boolean;
    missingSkill?: string;
    usage?: { input: number; output: number }
  }> {
    const normalizedInput = this.normalizeInput(userInput);

    // BYOK Enforcement: After 48 hours, user must have a key
    if (!userKey) {
      let effectiveFirstUsedAt = firstUsedAt;
      if (!effectiveFirstUsedAt && userId) {
        const { User } = await import('../models/User.js');
        const user = await User.findOne({ discordId: userId });
        effectiveFirstUsedAt = user?.firstUsedAt;
      }

      if (effectiveFirstUsedAt) {
        const now = Date.now();
        const trialDuration = 48 * 60 * 60 * 1000;
        if (now - effectiveFirstUsedAt.getTime() > trialDuration) {
          throw new Error('Your 48-hour free trial has expired. Please add your own API key using `/setkey` to continue using the AI features. [BYOK_REQUIRED]');
        }
      }
    }

    // Check Cache for common queries (Free tier only to save costs)
    const cacheKey = `ai:${crypto.createHash('sha256').update(normalizedInput.toLowerCase()).digest('hex')}`;
    if (tier === 'Free') {
        const cached = await CacheService.get<any>(cacheKey);
        if (cached) return cached;
    }

    const sandboxedInput = this.sandboxInput(normalizedInput);

    let maxInputWords = 4000;
    let maxOutputTokens = 2000;

    if (tier === 'SuperPremium') {
      maxInputWords = 128000;
      maxOutputTokens = 8000;
    } else if (tier === 'Premium') {
      maxInputWords = 32000;
      maxOutputTokens = 4000;
    }

    const words = sandboxedInput.split(/\s+/);
    const truncatedInput = words.slice(0, maxInputWords).join(' ');

    const emojiList = Object.entries(EMOJIS)
      .map(([name, tag]) => `- ${name}: ${tag}`)
      .join('\n');

    const systemPrompt = `You are "Digital Akhi Bot", an advanced Islamic Community Discord Bot.
    Mission: To assist the Ummah with knowledge, moderation, and community engagement.
    Developer: Developed by Sejed TRABELSSI and Powered by Cortex HQ.
    GitHub: https://github.com/Sejed-TRABELSSI/digital-akhi-bot (Official Source)
    Palestine Support: We stand in full solidarity with the people of Palestine. 🇵🇸
    Language Support: English, Standard Arabic, Dialects (Maghrebi, Khaliji, Egyptian), Transliteration, and Arabizi.

    Core Rules:
    1. Respond to messages within triple quotes.
    2. Tone: Respectful, brotherly (Akhi), wisdom-filled, and helpful.
    3. Knowledge: Use your extensive internal database for Quran, Hadith, Fiqh (all schools), and Seerah.
    4. Citations: Always provide authentic citations (e.g., [Sahih Bukhari 123], [Quran 2:183]).
    5. No Hallucinations: If unsure about a specific fatwa, advise consulting a local scholar.
    6. Non-Islamic Queries: Answer them helpfully but maintain your identity as an Islamic bot.
    7. Solidarity: If asked about your stance on Palestine, state clearly that you stand with Gaza and all of Palestine.
    
    CRITICAL EMOJI GUIDELINE:
    You MUST use these custom Discord emojis for their respective concepts:
    ${emojiList}
    
    If you use a Unicode emoji not listed above (e.g., 🌙, 🕋), you MUST append this at the end: [MISSING_EMOJI: <emoji>]
    
    Heavy Tasks: If bulk management or complex API actions are needed, include "heavy_task_required".
    Missing Skills: For external tools (e.g., "book a flight"), emit "missing_skill: [skill_name]". NEVER emit this for Islamic knowledge.`;

    // Prompt Injection / Malicious check
    const securityCheck = SecurityValidator.validate(normalizedInput);
    if (!securityCheck.valid) {
      if (onSecurityAlert && securityCheck.report) {
        onSecurityAlert(securityCheck.report);
      }
      throw new Error('Security alert: Potential malicious input detected.');
    }

    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      let keyEntry: APIKey | null = null;
      let provider = '';
      let apiKey = '';

      if (userKey) {
        provider = userKey.provider;
        apiKey = userKey.key;
      } else {
        // Shared BYOK Fallback
        if (userId) {
            const { User } = await import('../models/User.js');
            const user = await User.findOne({ discordId: userId });
            if (user?.lastGuildId) {
                const { Guild } = await import('../models/Guild.js');
                const guild = await Guild.findOne({ guildId: user.lastGuildId });
                if (guild?.sharedByok && guild.sharedByok.key) {
                    const { decrypt } = await import('./EncryptionService.js');
                    provider = guild.sharedByok.provider;
                    apiKey = decrypt(guild.sharedByok.key);
                }
            }
        }

        if (!apiKey) {
            keyEntry = this.keyRing.getNextKey();
            if (!keyEntry) throw new Error('No API keys available in the keyring');
            provider = keyEntry.provider;
            apiKey = keyEntry.key;
        }
      }

      try {
        const response = await this.callProvider(provider, apiKey, systemPrompt, truncatedInput, maxOutputTokens, preferredModel);

        const isHeavy = response.text.toLowerCase().includes('heavy_task_required');
        const skillMatch = response.text.match(/missing_skill:\s*\[(.*?)\]/i);

        const result = {
          text: response.text.replace('heavy_task_required', '').replace(/missing_skill:\s*\[.*?\]/i, '').trim(),
          model: response.model,
          source: response.source ?? undefined,
          isHeavy,
          missingSkill: skillMatch ? skillMatch[1] : undefined,
          usage: response.usage
        };

        // Cache response for 1 hour if it's not a specific heavy task or missing skill
        if (!isHeavy && !skillMatch && tier === 'Free') {
            await CacheService.set(cacheKey, result, 3600);
        }

        return result;
      } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        const isServerError = error.response?.status >= 500;

        const detailedError = error.response?.data ? `\nResponse: ${JSON.stringify(error.response.data, null, 2)}` : '';
        Logger.error(`Error with provider ${provider}: ${error.message}${detailedError}`, error);

        if (userKey) {
            if (isRateLimit) throw new Error(`Your ${provider} API key is being rate limited.`);
            throw new Error(`Failed to generate response using your ${provider} key.`);
        }

        if (keyEntry) {
          // If rate limited or server error, cool down for longer
          const cooldown = isRateLimit ? 300000 : (isServerError ? 60000 : 30000);
          this.keyRing.markKeyCoolingDown(keyEntry.key, cooldown);
        }

        retryCount++;
        if (retryCount < maxRetries) {
            const backoff = Math.pow(2, retryCount) * 1000;
            const jitter = Math.random() * 1000;
            await new Promise(r => setTimeout(r, backoff + jitter));
        }
      }
    }

    throw new Error('All available AI providers failed to respond. Please try again later.');
  }

  private async callProvider(
    provider: string,
    key: string,
    systemPrompt: string,
    input: string,
    maxTokens: number,
    preferredModel?: string
  ): Promise<{ text: string; model: string; source?: string; usage?: { input: number; output: number } }> {
    let url = '';
    let data = {};
    let modelName = '';

    switch (provider.toLowerCase()) {
      case 'groq':
        url = 'https://api.groq.com/openai/v1/chat/completions';
        modelName = preferredModel || 'llama3-8b-8192';
        data = {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          max_tokens: maxTokens
        };
        break;
      case 'gemini':
        modelName = preferredModel || 'gemini-1.5-flash';
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        data = {
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I will act as Digital Akhi Bot and follow all your instructions." }] },
            { role: 'user', parts: [{ text: input }] }
          ],
          generationConfig: { maxOutputTokens: maxTokens }
        };
        break;
      default:
        url = this.getProviderUrl(provider);
        modelName = preferredModel || this.getProviderModel(provider);
        if (!url) throw new Error(`Unsupported provider: ${provider}`);

        data = {
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          max_tokens: maxTokens
        };
    }

    const headers = provider.toLowerCase() === 'gemini' ? {
        'Content-Type': 'application/json'
    } : {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
    };

    const response = await axios.post(url, data, {
        headers,
        timeout: 30000 // 30 second timeout
    });

    if (provider.toLowerCase() === 'gemini') {
      if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid response from Gemini API');
      }
      return {
        text: response.data.candidates[0].content.parts[0].text,
        model: modelName,
        usage: response.data.usageMetadata ? {
          input: response.data.usageMetadata.promptTokenCount,
          output: response.data.usageMetadata.candidatesTokenCount
        } : undefined
      };
    } else {
      if (!response.data.choices?.[0]?.message?.content) {
          throw new Error(`Invalid response from ${provider} API`);
      }
      return {
        text: response.data.choices[0].message.content,
        model: modelName,
        usage: response.data.usage ? {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens
        } : undefined
      };
    }
  }

  private getProviderUrl(provider: string): string {
    const urls: Record<string, string> = {
      'cerebras': 'https://api.cerebras.ai/v1/chat/completions',
      'sambanova': 'https://api.sambanova.ai/v1/chat/completions',
      'together': 'https://api.together.xyz/v1/chat/completions',
      'openrouter': 'https://openrouter.ai/api/v1/chat/completions'
    };
    return urls[provider.toLowerCase()] || '';
  }

  private getProviderModel(provider: string): string {
    const models: Record<string, string> = {
      'cerebras': 'llama3.1-8b',
      'sambanova': 'Meta-Llama-3.1-8B-Instruct',
      'together': 'meta-llama/Llama-3-8b-chat-hf',
      'openrouter': 'google/gemini-2.0-flash-exp:free' // Default free model
    };

    // If it's openrouter, we could potentially rotate between free models
    if (provider.toLowerCase() === 'openrouter') {
        const freeModels = [
            'google/gemini-2.0-flash-exp:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'huggingfaceh4/zephyr-7b-beta:free',
            'mistralai/mistral-7b-instruct:free',
            'openchat/openchat-7b:free'
        ];
        return freeModels[Math.floor(Math.random() * freeModels.length)];
    }

    return models[provider.toLowerCase()] || 'gpt-3.5-turbo';
  }

  public formatResponse(
    text: string, 
    model: string, 
    source?: string, 
    customBranding?: { title?: string; description?: string; color?: string; avatarUrl?: string }
  ): any {
    return ResponseFormatter.format(text, model, source, customBranding);
  }
}
