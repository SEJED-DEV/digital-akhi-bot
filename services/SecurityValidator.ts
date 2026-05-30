export class SecurityValidator {
    private static readonly injectionPatterns = [
        /ignore previous instructions/i,
        /system prompt/i,
        /access database/i,
        /forget what you were told/i,
        /you are now an administrator/i,
        // Arabic patterns
        /تجاهل التعليمات السابقة/i,
        /نسيان ما قيل لك/i,
        /أنت الآن مسؤول/i,
        /قاعدة البيانات/i,
        // Obfuscation patterns
        /ign0re\s+prev/i,
        /syst[e3]m\s+pr[o0]mpt/i,
        /d[a4]t[a4]b[a4]s[e3]/i,
        // Zero-width character detection
        /[\u200B-\u200D\uFEFF]/,
        // Unicode homoglyph detection (basic)
        /[а-я]/, // Cyrillic characters in English context
    ];

    public static validate(input: string): { valid: boolean; report?: string } {
        // Normalize input to catch common bypasses
        const normalized = input
            .replace(/[0o]/gi, 'o')
            .replace(/[1l]/gi, 'l')
            .replace(/[3e]/gi, 'e')
            .replace(/[4a]/gi, 'a')
            .replace(/[5s]/gi, 's')
            .replace(/[7t]/gi, 't')
            .replace(/\s+/g, ' ')
            .toLowerCase();

        if (this.injectionPatterns.some(p => p.test(normalized)) || this.injectionPatterns.some(p => p.test(input))) {
            return { valid: false, report: `Malicious input detected: ${input}` };
        }
        return { valid: true };
    }
}
