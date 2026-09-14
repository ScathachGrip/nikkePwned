export interface Account {
  nickname: string;
  email: string;
  password?: string;
}

export interface HistoryLog {
  account: string;
  eventType: string;
  isSuccess: string;
  timestamp: number;
  accountWhat?: string;
  typeWhat?: string;
  is_success?: string;
  dateWhat?: number;
}

export interface BurstBonkConfig {
  keys: string[];
  interval_ms?: number;
  intervalMs?: number;
  humanized?: boolean;
}

export interface LoginResult {
  success: boolean;
  message: string;
}
