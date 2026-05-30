import { Message } from 'discord.js';

export class SkillLearningService {
  private static activeLearningCount = 0;
  private static readonly CONCURRENCY_LIMIT = 3;
  private static learningQueue: { message: Message; skillName: string }[] = [];

  public static async initiateLearning(message: Message, skillName: string) {
    if (this.activeLearningCount >= this.CONCURRENCY_LIMIT) {
        this.learningQueue.push({ message, skillName });
        await message.reply(`*\"I have many things to learn right now, brother. I've added '${skillName}' to my queue and will start soon, for Allah.\"*`);
        return;
    }

    await this.startLearning(message, skillName);
  }

  private static async startLearning(message: Message, skillName: string) {
    this.activeLearningCount++;
    await message.reply(`*\"I haven't learned how to ${skillName} yet, but I've just started for you! Give me some time to learn this, brother.\"*`);

    // Simulate learning/creation process in background
    setTimeout(async () => {
        try {
            console.log(`Dynamic skill learned: ${skillName}`);

            if (message.channel.isTextBased()) {
                await (message.channel as any).send(`<@${message.author.id}>, I have learned how to **${skillName}**! Here is the result of your request.`);
            }
        } catch (error) {
            console.error('Skill learning failed:', error);
        } finally {
            this.activeLearningCount--;
            this.processQueue();
        }
    }, 15000); // Simulate 15 seconds
  }

  private static async processQueue() {
      if (this.learningQueue.length > 0 && this.activeLearningCount < this.CONCURRENCY_LIMIT) {
          const next = this.learningQueue.shift();
          if (next) {
              await this.startLearning(next.message, next.skillName);
          }
      }
  }
}
