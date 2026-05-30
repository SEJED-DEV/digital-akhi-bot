import { Logger } from './Logger.js';

export class InviteProcessingService {
    private static processingMembers = new Map<string, number>();
    private static readonly PROCESSING_TIMEOUT = 30000; // 30 seconds

    public static startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [id, timestamp] of this.processingMembers.entries()) {
                if (now - timestamp > this.PROCESSING_TIMEOUT) {
                    this.processingMembers.delete(id);
                    Logger.warn(`Cleaned up stuck processing for member ${id}`);
                }
            }
        }, 60000);
    }

    /**
     * Attempts to mark a member as being processed.
     * Uses a double-check pattern with a small delay to mitigate race conditions in concurrent event loops.
     */
    public static async tryStartProcessing(memberId: string): Promise<boolean> {
        const now = Date.now();
        const lastProcessed = this.processingMembers.get(memberId);

        if (lastProcessed && (now - lastProcessed) < this.PROCESSING_TIMEOUT) {
            return false;
        }

        this.processingMembers.set(memberId, now);

        // Small delay to allow race detection
        await new Promise(resolve => setTimeout(resolve, 10));

        const checkAgain = this.processingMembers.get(memberId);
        if (checkAgain !== now) {
            // Another "thread" overwrote our timestamp
            return false;
        }

        return true;
    }

    public static isProcessing(memberId: string): boolean {
        const now = Date.now();
        const lastProcessed = this.processingMembers.get(memberId);
        if (lastProcessed && (now - lastProcessed) < this.PROCESSING_TIMEOUT) {
            return true;
        }
        return false;
    }

    public static markAsProcessing(memberId: string) {
        this.processingMembers.set(memberId, Date.now());
    }

    public static unmarkAsProcessing(memberId: string) {
        this.processingMembers.delete(memberId);
    }
}
