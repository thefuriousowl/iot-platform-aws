import { Injectable } from "@nestjs/common";
import { Counter, Histogram, register } from 'prom-client';


@Injectable()
export class MetricsService {

    // Counters
    public readonly messagesReceived: Counter;
    public readonly messagesProcessed: Counter;
    public readonly duplicatesSkipped: Counter;
    public readonly alertsCreated: Counter;

    // Histograms
    public readonly alertLatency: Histogram;

    constructor() {
        // Messages received from MQTT
        this.messagesReceived = new Counter({
            name: 'ingestion_messages_received_total',
            help: 'Total number of messages received from MQTT',
            labelNames: ['site', 'gateway', 'metric'],
        });

        // Messages successfully processed and stored
        this.messagesProcessed = new Counter({
            name: 'ingestion_messages_processed_total',
            help: 'Total number of messages successfully processed and stored',
            labelNames: ['site', 'gateway', 'metric'],
        });

        // Duplicate messages skipped
        this.duplicatesSkipped = new Counter({
            name: 'ingestion_duplicates_total',
            help: 'Total number of duplicate messages skipped',
            labelNames: ['site', 'gateway'],
        });

        // Alerts created
        this.alertsCreated = new Counter({
            name: 'alerts_created_total',
            help: 'Total number of alerts created',
            labelNames: ['site', 'gateway', 'severity']
        })

        // Alert latency (time from message receive to alert creation)
        this.alertLatency = new Histogram({
            name: 'alert_latency_seconds',
            help: 'Time from message receive to alert creation in seconds',
            labelNames: ['site', 'gateway', 'severity'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] 
        })
    }
}