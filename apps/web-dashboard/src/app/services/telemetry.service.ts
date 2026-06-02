import { Injectable } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { Alert, TelemetryReading } from "../models/telemetry.model";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private socket: Socket;
  private telemetry$ = new Subject<TelemetryReading>();
  private alerts$ = new Subject<Alert>();
  private connected$ = new BehaviorSubject<boolean>(false);
  constructor() {
    console.log('Connecting to:', environment.apiBaseUrl);
    this.socket = io(environment.apiBaseUrl, {
      transports: ['websocket', 'polling'], // Force WebSocket transport
    });

    this.socket.on('connect', () => {
      console.log('Connected to telemetry stream, socket id:', this.socket.id);
      this.connected$.next(true);
    });

    this.socket.on('telemetry', (data: TelemetryReading) => {
      console.log('Received telemetry:', data);
      this.telemetry$.next(data);
    });
    this.socket.on('alert', (data: Alert) => {
      console.log('Received alert:', data);
      this.alerts$.next(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from telemetry stream');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }


  getTelemetryStream(): Observable<TelemetryReading> {
    return this.telemetry$.asObservable();
  }

  getAlertStream(): Observable<Alert> {
    return this.alerts$.asObservable();
  }

}