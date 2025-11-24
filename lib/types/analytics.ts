export interface ActiveUserTrends {
  realTime: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export interface ActiveUserMetrics {
  realTimeActive: number;
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  timestamp: Date;
  trends?: ActiveUserTrends;
}
