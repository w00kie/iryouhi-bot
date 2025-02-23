import { conversations } from "@grammyjs/conversations";
import Debug from "debug";

import type { MyConversation } from "@/types";

const debug = Debug("bot:jobQueue");

export interface Job {
  type: string;
  jobFunction: (payload: any) => Promise<void>;
  payload: any;
  conversation?: MyConversation;
}

// Simple in-memory queue array
const jobQueue: Job[] = [];

/**
 * Enqueue a new job.
 */
export function enqueueJob(job: Job) {
  jobQueue.push(job);
}

/**
 * Process jobs in the queue.
 * Runs periodically to process jobs one-by-one.
 */
async function processJob(job: Job): Promise<void> {
  try {
    debug("Start processing job: %s", job.type);
    await job.jobFunction(job.payload);
    debug("Finished processing job: %s", job.type);
  } catch (error) {
    console.error(`Error processing ${job.type} job:`, error);
    if (job.conversation) {
      job.conversation.external(async (ctx) => {
        await ctx.reply("An error occurred while processing. Please try again.");
      });
      job.conversation.halt();
    }
  }
}

/**
 * Starts a background worker that checks for new jobs every second.
 */
setInterval(async () => {
  if (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (job) {
      await processJob(job);
    }
  }
}, 1000);
