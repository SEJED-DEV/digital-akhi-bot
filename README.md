# Islamic Community Discord Bot 🇵🇸

A production-grade, secure, and resilient Discord bot designed for Islamic communities. Powered by **Cortex HQ** and developed by **Sejed TRABELSSI**.

> **🇵🇸 Solidarity Statement**: We stand in full solidarity with the people of Palestine and Gaza. This project is dedicated to supporting the global Muslim community (the Ummah).

## Features

- **AI-Powered Interactions**: Natural language parsing of Standard Arabic, English transliteration, and Arabizi.
- **Dynamic API Key Rotation**: Multi-provider failover (Gemini, Groq, Cerebras, etc.) for 100% reliability.
- **Islamic Utility Commands**:
  - `/dua`: Contextual supplications.
  - `/hadith`: Verified Hadiths with source gradings.
  - `/prayer`: Local prayer times via Aladhan API.
- **Access Tiers & Rate Limiting**:
  - **Free**: 20 requests per 6-hour sliding window.
  - **Premium**: Elevated limits (50/6h), requires 30 invites or 2 server boosts.
- **Zero-Trust Security**:
  - Triple-quote prompt sandboxing.
  - Backend permission verification for all moderation tools.
  - BYOK (Bring Your Own Key) mode with encrypted at-rest storage.
- **Advanced Moderation**: AI-triggered tools (ban, kick, warn, manage roles) with `isHeavyTask` interception.
- **Data Lifecycle Management**: 30-day hot storage with automated nightly zlib archiving to cold storage.
- **Centralized Custom Emojis & Auto-Reporting**:
  - 100% centralized custom emojis mapped inside `utils/Emojis.ts` (zero static unicode icons).
  - The AI is fed the custom emoji registry and dynamically chooses appropriate custom emojis.
  - If a required concept is not in the custom registry, the AI uses a static unicode icon and **automatically reports the missing emoji** to a custom `#emoji-requests` channel in the support server so the development team can expand the registry.

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript
- **Framework**: discord.js (v14)
- **Database**: MongoDB (Mongoose) & Redis (Rate-limiting)
- **Deployment**: Vercel (Website) & VPS/Docker (Bot)

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SEJED-DEV/digital-akhi-bot.git
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file with:
   - `DISCORD_TOKEN`, `CLIENT_ID`, `SUPPORT_SERVER_ID`, `SECURITY_ALERT_CHANNEL_ID`
   - `MONGODB_URI`, `REDIS_URL`
   - `API_KEYS` (Format: `provider:key,provider:key`)
   - `ENCRYPTION_KEY` (32 characters)
   
   **Generating the ENCRYPTION_KEY**:
   Run the following command in your terminal to generate a secure 32-character encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```
   Copy the output and use it as your `ENCRYPTION_KEY`.
4. **Deploy Commands**:
   ```bash
   npm run build
   node dist/deploy-commands.js
   ```
5. **Start the Bot**:
   ```bash
   npm start
   ```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the GNU AGPLv3 License - see the [LICENSE](LICENSE) file for details.

---

**Sejed TRABELSSI** & **Powered by Cortex HQ** [https://discord.gg/pun3PXXDuE](https://discord.gg/pun3PXXDuE)
