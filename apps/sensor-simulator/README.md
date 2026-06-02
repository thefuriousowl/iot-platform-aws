# Sensor Simulator

Publishes realistic Industrial IoT telemetry over MQTT so the platform can be exercised
without physical sensors.

## Run

```bash
pip install -r requirements.txt

# See data immediately, no broker needed:
python sim.py --profile gas-detection --rate 5 --dry-run

# Publish to a broker (e.g. the EMQX deployed by the platform, port-forwarded):
python sim.py --profile cems --broker localhost --port 1883 --site plant-a
```

## Profiles

| Profile         | Emits                                              | Notable behavior |
|-----------------|----------------------------------------------------|------------------|
| `gas-detection` | combustible gas ppm                                | ~2% chance of a leak spike per sample; `alarm` flag over threshold |
| `cems`          | NOx, SO2, CO, O2, stack flow                       | correlated continuous emissions |
| `water-quality` | pH, turbidity, dissolved O2, conductivity          | slow diurnal drift + noise |

Topic format: `telemetry/{site}/{gateway}/{profile}`
