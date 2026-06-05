#!/bin/bash
# =============================================================================
# Chaos Test: Redis Failover
# =============================================================================
# Purpose: Verify system recovers from Redis failure within SLO (< 10 seconds)
# Prerequisites:
#   - docker compose up -d
#   - ingestion service running on :3000
#   - sensor simulator running
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SLO_SECONDS=10
HEALTH_ENDPOINT="http://localhost:3000/health"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          CHAOS TEST: Redis Failover Recovery               ║"
echo "║          SLO Target: < ${SLO_SECONDS} seconds                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! docker ps | grep -q redis; then
  echo -e "${RED}ERROR: Redis container not running. Run 'docker compose up -d' first.${NC}"
  exit 1
fi

if ! curl -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
  echo -e "${YELLOW}WARNING: Ingestion service not responding at $HEALTH_ENDPOINT${NC}"
  echo "Proceeding anyway..."
fi

# Record baseline
echo ""
echo "📊 Baseline metrics before chaos:"
curl -s http://localhost:3000/metrics 2>/dev/null | grep ingestion_messages || echo "  (metrics not available)"

# Start chaos
echo ""
echo -e "${YELLOW}💥 INJECTING CHAOS: Killing Redis container...${NC}"
START=$(date +%s.%N)

docker kill "$(docker ps -q -f name=redis)" 2>/dev/null || true

# Wait for recovery
echo "⏱  Waiting for recovery..."
RECOVERED=false
for i in {1..30}; do
  sleep 1
  if curl -s "$HEALTH_ENDPOINT" 2>/dev/null | grep -q "ok"; then
    RECOVERED=true
    break
  fi
  echo "   ...still recovering (${i}s)"
done

END=$(date +%s.%N)
RECOVERY=$(echo "$END - $START" | bc)
RECOVERY_INT=${RECOVERY%.*}

echo ""
echo "════════════════════════════════════════════════════════════"

if [ "$RECOVERED" = true ] && [ "$RECOVERY_INT" -lt "$SLO_SECONDS" ]; then
  echo -e "${GREEN}✅ PASS: Recovery time ${RECOVERY}s (SLO: < ${SLO_SECONDS}s)${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}❌ FAIL: Recovery time ${RECOVERY}s (SLO: < ${SLO_SECONDS}s)${NC}"
  EXIT_CODE=1
fi

# Restart Redis for cleanup
echo ""
echo "🔄 Restarting Redis container..."
docker compose up -d redis

echo ""
echo "Test completed."
exit $EXIT_CODE
