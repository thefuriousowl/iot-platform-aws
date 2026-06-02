# Run `just <target>`. (Install: https://github.com/casey/just)

# Provision the dev cloud layer
up-infra:
    cd infra/terraform/envs/dev && terraform init && terraform apply

# Bootstrap GitOps (ArgoCD then syncs everything)
up-platform:
    kubectl apply -k platform/argocd/bootstrap

# Stream simulated gas-detection telemetry (no broker; prints locally)
sim-demo:
    python apps/sensor-simulator/sim.py --profile gas-detection --rate 5 --dry-run

# Tear everything down
down:
    cd infra/terraform/envs/dev && terraform destroy
