# GitOps with ArgoCD

```bash
# One-time bootstrap (after the cluster exists):
kubectl apply -k platform/argocd/bootstrap
```

This applies the **root app** (`root-app.yaml`), which uses the *app-of-apps* pattern:
it points ArgoCD at `apps/`, where each component (EMQX, Redis Sentinel, observability, …)
is its own `Application`. From then on, the cluster state is whatever is in `main` —
deploy by merging a PR, roll back with `git revert`.

> Replace `USERNAME` in the manifests with your GitHub handle (or template it in CI).
