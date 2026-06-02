# SensorGateway Operator

A small Kubernetes operator (scaffold with [kubebuilder](https://kubebuilder.io)) that adds
a `SensorGateway` custom resource. Applying a `SensorGateway` makes the controller reconcile
the supporting objects for one field gateway:

- a per-gateway ingestion `ConfigMap`
- an EMQX auth entry (so only known gateways can publish)
- the matching Prometheus alert rules for its `alertProfile`

This demonstrates **extending** the Kubernetes API (operator pattern) rather than only
consuming it — the distinction between "uses Kubernetes" and "builds on Kubernetes".

## Try it
```bash
kubectl apply -f config/crd/sensorgateway.yaml
kubectl apply -f config/samples/plant-a.yaml
kubectl get sensorgateways -n iot
```

## Build (kubebuilder layout)
```bash
make manifests && make install && make run   # standard kubebuilder targets
```
