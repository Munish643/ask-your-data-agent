#!/bin/sh
set -eu

api_base_url="${NEXT_PUBLIC_API_BASE_URL:-}"

if [ -z "$api_base_url" ] && [ -n "${NEXT_PUBLIC_API_HOST:-}" ]; then
  api_base_url="https://${NEXT_PUBLIC_API_HOST}"
fi

escaped_api_base_url=$(printf '%s' "$api_base_url" | sed 's/\\/\\\\/g; s/"/\\"/g')

mkdir -p /app/public
cat > /app/public/runtime-config.js <<EOF
window.__ASKDATA_CONFIG__ = {
  apiBaseUrl: "${escaped_api_base_url}"
};
EOF

exec "$@"
