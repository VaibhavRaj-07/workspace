import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { checkDeadlinesAndAlerts } from './deadline.job.js';

let deadlineTask: cron.ScheduledTask | null = null;

export function startScheduler() {
  const cronExpression = env.DEADLINE_CHECK_CRON || '*/5 * * * *';

  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression}`);
    return;
  }

  deadlineTask = cron.schedule(cronExpression, async () => {
    logger.debug('[Scheduler] Running deadline and overdue alert check...');
    await checkDeadlinesAndAlerts();
  });

  logger.info(`⏰ Background Scheduler started with schedule: "${cronExpression}"`);
}

export function stopScheduler() {
  if (deadlineTask) {
    deadlineTask.stop();
    logger.info('⏰ Background Scheduler stopped');
  }
}
