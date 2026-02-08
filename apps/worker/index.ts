import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processBulkResumeJob } from "./processor";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("REDIS_URL is required");
  process.exit(1);
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "bulk-resume-queue",
  async (job) => {
    await processBulkResumeJob(job);
  },
  {
    connection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err?.message);
});

console.log("[worker] Bulk resume worker started, waiting for jobs...");
