#!/usr/bin/env python3
"""
Industrial sensor simulator.

Publishes realistic telemetry over MQTT for three safety-critical profiles:
  - gas-detection   (ppm, with occasional leak spikes)
  - cems            (continuous emissions: NOx, SO2, CO, O2, flow)
  - water-quality   (pH, turbidity, dissolved O2, conductivity)

Lets anyone clone the repo and see live data flowing without real hardware.

Usage:
    python sim.py --profile gas-detection --rate 5
    python sim.py --profile cems --broker localhost --port 1883
    python sim.py --profile water-quality --site plant-b --dry-run
"""
import argparse
import json
import math
import random
import time
from datetime import datetime, timezone

try:
    import paho.mqtt.client as mqtt  # type: ignore[import]
except ImportError:
    mqtt = None  # --dry-run works without the dependency


# --- Per-profile signal generators -------------------------------------------------

def gas_detection(t: float) -> dict[str, object]:
    """Baseline low ppm with a small chance of a leak spike."""
    baseline = 5 + 2 * math.sin(t / 30)
    spike = 0.0
    if random.random() < 0.02:  # ~2% chance of a leak event per sample
        spike = random.uniform(40, 120)
    ppm = max(0.0, baseline + random.gauss(0, 0.5) + spike)
    return {
        "metric": "combustible_gas_ppm",
        "value": round(ppm, 2),
        "unit": "ppm",
        "alarm": ppm > 50,  # LEL-based threshold (illustrative)
    }


def cems(t: float) -> dict[str, object]:
    """Continuous emissions monitoring — multiple stack gases."""
    return {
        "metric": "stack_emissions",
        "values": {
            "nox_mg_nm3": round(max(0, 120 + 20 * math.sin(t / 60) + random.gauss(0, 5)), 1),
            "so2_mg_nm3": round(max(0, 35 + random.gauss(0, 3)), 1),
            "co_mg_nm3":  round(max(0, 18 + random.gauss(0, 2)), 1),
            "o2_pct":     round(max(0, 8 + random.gauss(0, 0.3)), 2),
            "flow_nm3_h": round(max(0, 45000 + random.gauss(0, 800)), 0),
        },
        "unit": "mixed",
    }


def water_quality(t: float) -> dict[str, object]:
    return {
        "metric": "water_quality",
        "values": {
            "ph":               round(7.0 + 0.4 * math.sin(t / 90) + random.gauss(0, 0.05), 2),
            "turbidity_ntu":    round(max(0, 1.2 + random.gauss(0, 0.2)), 2),
            "dissolved_o2_mgl": round(max(0, 8.5 + random.gauss(0, 0.3)), 2),
            "conductivity_uscm":round(max(0, 500 + random.gauss(0, 15)), 0),
        },
        "unit": "mixed",
    }
    
    
def confined_space(t: float) -> dict[str, object]:
    """Confined space monitoring - O2, CO, H2S for worker safety"""
    
    # Randomly pick which metric to send (simulates multiple sensors)
    sensors = ["o2_percent", "co_ppm", "h2s_ppm"]
    sensor = random.choice(sensors)
    
    if sensor == "o2_percent":
        # Normal 20.9%, danger below 19.5% or above 23.5%
        baseline = 20.9 + 0.5 * math.sin(t / 45)
        if random.random() < 0.03: # 3% chance of an O2 hazard event
            baseline -= random.uniform(1.5, 3.0) # Simulate drop to dangerous levels
        value = round(max(0, baseline + random.gauss(0, 0.1)), 2)
        alarm = value < 19.5 or value > 23.5
        return {
            "metric": "o2_percent",
            "value": value,
            "unit": "%",
            "alarm": alarm,
        }
        
    elif sensor == "co_ppm":
        # Normal: 0-5 ppm, warning: 9, critical: 35
        baseline = 2 + random.gauss(0,1)
        if random.random() < 0.02: # 2% chance of a CO
            baseline += random.uniform(30, 60) # Simulate a CO leak
        value = round(max(0, baseline), 1)
        return {
            "metric": "co_ppm",
            "value": value,
            "unit": "ppm",
            "alarm": value >= 9, # Alarm for both warning and critical levels
        }

    elif sensor == "h2s_ppm":
        # Normal: 0-5 ppm, warning 9, critical: 15
        baseline = 1 + random.gauss(0,0.5)
        if random.random() < 0.02: # 2% chance of an H2S leak
            baseline += random.uniform(10, 25)
        value = round(max(0, baseline), 1)
        return {
            "metric": "h2s_ppm",
            "value": value,
            "unit": "ppm",
            "alarm": value >= 9, # Alarm for both warning and critical levels
        }
        
        
def indoor_air(t: float) -> dict[str, object]:
    """Indoor air quality - CO2 monitoring"""
    # Normal: 400-1000 ppm, warning 1000, critical 2000
    baseline = 600 + 200 * math.sin(t/120) + random.gauss(0, 50) # Simulate occupancy patterns
    if random.random() < 0.03: # 3% chance of a spike (e.g. crowded event)
        baseline += random.uniform(800, 1500) 
    value = round(max(400, baseline + random.gauss(0, 30)), 0) # Ensure it doesn't go below outdoor levels
    return {
        "metric": "co2_ppm",
        "value": value,
        "unit": "ppm",
        "alarm": value >= 1000, # Alarm for both warning and critical levels
    }

PROFILES = {
    "gas-detection": gas_detection,
    "cems": cems,
    "water-quality": water_quality,
    "confined-space": confined_space,
    "indoor-air": indoor_air,
}


def main() -> None:
    p = argparse.ArgumentParser(description="Industrial sensor simulator")
    p.add_argument("--profile", choices=PROFILES.keys(), required=True)
    p.add_argument("--site", default="plant-a")
    p.add_argument("--gateway", default="gw-1")
    p.add_argument("--broker", default="localhost")
    p.add_argument("--port", type=int, default=1883)
    p.add_argument("--rate", type=float, default=1.0, help="samples per second")
    p.add_argument("--dry-run", action="store_true", help="print instead of publishing")
    args = p.parse_args()

    topic = f"telemetry/{args.site}/{args.gateway}/{args.profile}"
    gen = PROFILES[args.profile]

    client = None
    if not args.dry_run:
        if mqtt is None:
            raise SystemExit("paho-mqtt not installed. `pip install paho-mqtt` or use --dry-run")
        client = mqtt.Client()
        client.connect(args.broker, args.port, keepalive=30)
        client.loop_start()

    interval = 1.0 / args.rate
    t0 = time.time()
    print(f"[sim] profile={args.profile} site={args.site} topic={topic} "
          f"rate={args.rate}/s {'(dry-run)' if args.dry_run else ''}")
    try:
        while True:
            t = time.time() - t0
            reading = gen(t)
            payload: dict[str, object] = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "site": args.site,
                "gateway": args.gateway,
                **reading,
            }
            msg = json.dumps(payload)
            if args.dry_run:
                print(msg)
            else:
                if client is not None:
                    client.publish(topic, msg, qos=1)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[sim] stopped")
    finally:
        if client:
            client.loop_stop()
            client.disconnect()


if __name__ == "__main__":
    main()
