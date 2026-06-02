// Domain models shared across the dashboard.
// Mirrors the telemetry shape published by the sensor simulator and persisted by the
// ingestion service.

export type AlertProfile = 'gas-detection' | 'cems' | 'water-quality';
export type Severity = 'ok' | 'warning' | 'critical';

export interface SiteStatus {
  site: string;
  gateway: string;
  profile: AlertProfile;
  online: boolean;
  lastSeen: string;            // ISO timestamp
  severity: Severity;
}

export interface Reading {
  ts: string;
  site: string;
  gateway: string;
  metric: string;
  value?: number;              // single-value profiles (gas)
  values?: Record<string, number>; // multi-value profiles (cems, water)
  unit: string;
  alarm?: boolean;
}

export interface AlertEvent {
  id: string;
  ts: string;
  site: string;
  gateway: string;
  profile: AlertProfile;
  severity: Severity;
  message: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

export interface SloSnapshot {
  alertLatencyP99Seconds: number;   // SLO < 1s
  ingestionAvailability: number;    // SLO >= 0.999
  brokerUp: boolean;
}
