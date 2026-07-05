#!/usr/bin/env bash
# Render every Kustomize overlay and Helm chart into per-app files under $1.
# Run from the repo root. Used by the render-diff workflow to compare a PR
# against main; locally with Helm 4 you must `helm repo add` each repository
# in Chart.yaml first (the CI runner's Helm 3 fetches unmanaged repos itself).
set -euo pipefail

out="$1"
mkdir -p "${out}"

for dir in apps/*/envs/*/ infrastructure/*/; do
  [ -d "${dir}" ] || continue
  kustomize build "${dir}" > "${out}/$(echo "${dir%/}" | tr / _).yaml"
done

for chart in apps-helm/* infrastructure-helm/*; do
  [ -f "${chart}/Chart.yaml" ] || continue
  helm dependency build "${chart}" > /dev/null
  if [ -d "${chart}/envs" ]; then
    for values in "${chart}"/envs/*/values.yaml; do
      env="$(basename "$(dirname "${values}")")"
      helm template "${chart}" -f "${values}" > "${out}/$(echo "${chart}" | tr / _)_${env}.yaml"
    done
  else
    helm template "${chart}" -f "${chart}/values.yaml" > "${out}/$(echo "${chart}" | tr / _).yaml"
  fi
done
