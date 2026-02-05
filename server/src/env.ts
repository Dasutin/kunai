import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const contentFetchFlag = process.env.CONTENT_FETCH_ENABLED?.toLowerCase();

export const env = {
  port: Number(process.env.PORT || 3000),
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  refreshMinutes: numberFromEnv(process.env.REFRESH_INTERVAL_MINUTES, 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  // Default on; only disable if explicitly set to "false"
  contentFetchEnabled: contentFetchFlag === undefined ? true : contentFetchFlag === 'true',
  contentFetchMaxPerRefresh: numberFromEnv(process.env.CONTENT_FETCH_MAX_PER_REFRESH, 3),
  maxUploadMb: numberFromEnv(process.env.MAX_UPLOAD_MB, 5)
};
