#!/bin/bash

# ==============================================================================
# SmartShield Unified Runner: Group 1 (Static Search) + Group 2 (Dynamic Validator)
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
export PATH=/opt/homebrew/bin:$PATH

echo ""
echo "======================================================================"
echo "          SMARTSHIELD: UNIFIED PIPELINE (GROUP 1 + GROUP 2)           "
echo "======================================================================"
echo "  [Group 1] Static Analysis & Candidate Attack Paths (Port 3000)"
echo "  [Group 2] Dynamic Validation, SMT Solver & Simulation (Port 3001)"
echo "======================================================================"
echo ""

# Trap SIGINT and SIGTERM to kill all background processes cleanly
cleanup() {
  echo ""
  echo "Shutting down SmartShield services..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Group 1 (Port 3000)
echo "▶ Starting Group 1 (SmartShield Static Analysis) on http://localhost:3000..."
cd "$DIR/SmartShield"
PORT=3000 npm start &
G1_PID=$!

# Wait briefly for Group 1 to boot
sleep 2

# 2. Start Group 2 (Port 3001)
echo "▶ Starting Group 2 (Attack Path Validator & Simulator) on http://localhost:3001..."
cd "$DIR/smartshield-group2"
PORT=3001 npm start &
G2_PID=$!

echo ""
echo "======================================================================"
echo "  ALL SERVICES RUNNING:"
echo "   - Group 1 UI & Static Analysis:  http://localhost:3000"
echo "   - Group 2 UI & Dynamic Validator: http://localhost:3001"
echo ""
echo "  Press Ctrl+C to stop both services."
echo "======================================================================"
echo ""

wait $G1_PID $G2_PID
