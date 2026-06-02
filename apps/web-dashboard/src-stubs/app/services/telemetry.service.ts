import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlertEvent, Reading, SiteStatus, SloSnapshot } from '../models/telemetry.model';

/**
 * TelemetryService
 * ----------------
 * Talks to the Client API (REST) for snapshots and to the ingestion service over
 * WebSocket for the live stream of readings and alerts.
 *
 * Endpoints are environment-configured (see src/environments) so the same build runs
 * against local dev, the in-cluster service, or a demo mock.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  // Reactive state via Angular signals.
  readonly sites = signal<SiteStatus[]>([]);
  readonly alerts = signal<AlertEvent[]>([]);
  readonly slo = signal<SloSnapshot | null>(null);

  readonly criticalCount = computed(
    () => this.alerts().filter(a => a.severity === 'critical' && !a.acknowledged).length
  );

  private ws?: WebSocket;
  private readonly readingStream = new Subject<Reading>();
  readonly readings$ = this.readingStream.asObservable();

  constructor(private http: HttpClient) {}

  /** Initial REST snapshot of sites + SLO state. */
  loadSnapshot(): void {
    this.http.get<SiteStatus[]>(`${environment.apiBase}/sites`)
      .subscribe(s => this.sites.set(s));
    this.http.get<SloSnapshot>(`${environment.apiBase}/slo`)
      .subscribe(s => this.slo.set(s));
    this.http.get<AlertEvent[]>(`${environment.apiBase}/alerts?active=true`)
      .subscribe(a => this.alerts.set(a));
  }

  /** Live updates over WebSocket. Auto-reconnects with backoff. */
  connectLive(): void {
    const url = environment.wsBase + '/stream';
    this.ws = new WebSocket(url);

    this.ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'reading') {
        this.readingStream.next(msg.payload as Reading);
        this.touchSite(msg.payload);
      } else if (msg.type === 'alert') {
        this.alerts.update(list => [msg.payload as AlertEvent, ...list].slice(0, 100));
      } else if (msg.type === 'slo') {
        this.slo.set(msg.payload as SloSnapshot);
      }
    };

    this.ws.onclose = () => setTimeout(() => this.connectLive(), 2000); // simple backoff
  }

  acknowledge(alertId: string): Observable<void> {
    this.alerts.update(list =>
      list.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a))
    );
    return this.http.post<void>(`${environment.apiBase}/alerts/${alertId}/ack`, {});
  }

  private touchSite(r: Reading): void {
    this.sites.update(list =>
      list.map(s =>
        s.site === r.site && s.gateway === r.gateway
          ? { ...s, online: true, lastSeen: r.ts,
              severity: r.alarm ? 'critical' : s.severity }
          : s
      )
    );
  }
}
