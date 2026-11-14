import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";

const crons = cronJobs();

// Daily automated backup of all core ERP data, 02:00 UTC (low-traffic window)
crons.daily("daily backup snapshot", { hourUTC: 2, minuteUTC: 0 }, internal.backup.runScheduledBackup);

// Partner contracts: auto-delist expired listings and send 30/7/1-day reminders (07:00 Lagos)
crons.daily("partner contract check", { hourUTC: 6, minuteUTC: 0 }, internal.partnerContracts.runDailyContractCheck, {});

// Currency conversion: refresh NGN → USD/EUR/GBP reference rates twice a day (07:00 and 19:00 Lagos)
crons.cron("fx rates refresh", "0 6,18 * * *", internal.fx.fetchLiveRates, {});

export default crons;
