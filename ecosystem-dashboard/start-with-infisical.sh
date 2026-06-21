#!/usr/bin/env bash
set -euo pipefail

CREDS="${INFISICAL_CREDS_FILE:-/home/eleazar/.config/infisical/kids-dashboard.env}"
SITE_URL="${INFISICAL_SITE_URL:-http://127.0.0.1:8791}"
SECRET_PATH="${INFISICAL_SECRET_PATH:-/kids-dashboard}"
WORKDIR="/home/eleazar/Projects/AIHomelab/ecosystem-dashboard/ecosystem-dashboard"

if [[ ! -r "$CREDS" ]]; then
  echo "kids-dashboard: credentials file $CREDS not readable" >&2
  exit 1
fi

source <(sed -E 's/^/export /' "$CREDS")

: "${INFISICAL_PROJECT_ID:?set in $CREDS}"
: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_ID:?set in $CREDS}"
: "${INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET:?set in $CREDS}"

command -v infisical >/dev/null || { echo "kids-dashboard: infisical CLI not installed" >&2; exit 1; }
command -v npm >/dev/null || { echo "kids-dashboard: npm not installed" >&2; exit 1; }

cd "$WORKDIR"

TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID" \
  --client-secret="$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET" \
  --domain="$SITE_URL" \
  --silent --plain)

[[ -n "$TOKEN" ]] || { echo "kids-dashboard: Infisical login returned empty token" >&2; exit 1; }

echo "kids-dashboard: fetching secrets from ${SECRET_PATH} and launching..."
if [[ $# -gt 0 ]]; then
  CMD=("$@")
else
  if [[ -f .next/BUILD_ID ]]; then
    CMD=(npm run start)
  else
    CMD=(npm run dev:nextonly)
  fi
fi

exec infisical run \
  --token="$TOKEN" \
  --projectId="$INFISICAL_PROJECT_ID" \
  --env=prod \
  --path="$SECRET_PATH" \
  -- "${CMD[@]}"
