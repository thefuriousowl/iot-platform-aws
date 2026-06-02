import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../services/telemetry.service';
import { Severity } from '../models/telemetry.model';

/**
 * DashboardComponent
 * ------------------
 * Operator-facing real-time view: site/gateway status grid, live readings, an active-alert
 * feed with acknowledge, and SLO summary tiles. Deliberately business/operator oriented —
 * Grafana remains the deep technical view; this is the at-a-glance control surface.
 *
 * Uses Angular signals from TelemetryService for zoneless-friendly reactive rendering.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private telemetry = inject(TelemetryService);

  sites = this.telemetry.sites;
  alerts = this.telemetry.alerts;
  slo = this.telemetry.slo;
  criticalCount = this.telemetry.criticalCount;

  ngOnInit(): void {
    this.telemetry.loadSnapshot();
    this.telemetry.connectLive();
  }

  activeAlerts() {
    return this.alerts().filter(a => !a.acknowledged);
  }

  ack(id: string): void {
    this.telemetry.acknowledge(id).subscribe();
  }

  sevClass(s: Severity): string {
    return `stat-${s}`;
  }

  latencyOk(): boolean {
    const s = this.slo();
    return !!s && s.alertLatencyP99Seconds < 1;
  }

  availabilityOk(): boolean {
    const s = this.slo();
    return !!s && s.ingestionAvailability >= 0.999;
  }
}
