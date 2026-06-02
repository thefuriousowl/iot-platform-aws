import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TelemetryService } from '../services/telemetry.service';
import { Alert, Severity, TelemetryReading } from '../models/telemetry.model';
import { Subscription } from 'rxjs';

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
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  readings: TelemetryReading[] = [];
  alerts: Alert[] = [];
  connected: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private telemetryService: TelemetryService
  ) { }

  ngOnInit() {
    // Subscribe to connection status
    this.subscriptions.push(
      this.telemetryService.getConnectionStatus().subscribe((status) => {
        this.connected = status;
      })
    );

    this.subscriptions.push(
      this.telemetryService.getTelemetryStream().subscribe((reading) => {
        this.readings = [reading, ...this.readings.slice(0, 19)];
      })
    );

    this.subscriptions.push(
      this.telemetryService.getAlertStream().subscribe((alert) => {
        this.alerts = [alert, ...this.alerts.slice(0, 9)];
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.connected = false;
  }

}
