export const appConfig = {
  dataDir: process.env.DATA_DIR ?? "data",
  appOrigin: process.env.APP_ORIGIN,
  isProduction: process.env.NODE_ENV === "production",
  maxTreesPerAccount: Math.max(1, Number(process.env.MAX_TREES_PER_ACCOUNT ?? 2)),
  accessCodeMinutes: Math.max(1, Number(process.env.ACCESS_CODE_MINUTES ?? 10)),
  inviteDays: Math.max(1, Number(process.env.INVITE_DAYS ?? 14)),
  sessionDays: Math.max(1, Number(process.env.SESSION_DAYS ?? 30))
};
