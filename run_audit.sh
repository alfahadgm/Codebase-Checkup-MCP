#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
#  System Audit Runner — Headless mode (Option B: claude -p)
# ============================================================================
#
#  Usage:
#    ./run_audit.sh                          # Run all 10 prompts
#    ./run_audit.sh --start-from 3           # Resume from P3
#    ./run_audit.sh --only 5                 # Run only P5
#    ./run_audit.sh --model opus             # Use specific model
#    ./run_audit.sh --dry-run                # Preview without executing
#
#  Run this FROM your project root. It expects .claude/skills/system-audit/
#  to exist in the current directory.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR=".claude/skills/system-audit/prompts"
REPORTS_DIR="audit-reports"
SKILL_FILE=".claude/skills/system-audit/SKILL.md"
LOG_FILE="audit.log"
MODEL="sonnet"
MAX_TURNS=30
START_FROM=1
ONLY=""
DRY_RUN=false

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

while [[ $# -gt 0 ]]; do
  case $1 in
    --start-from) START_FROM="$2"; shift 2 ;;
    --only)       ONLY="$2"; shift 2 ;;
    --model)      MODEL="$2"; shift 2 ;;
    --max-turns)  MAX_TURNS="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    *)            echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -d "$PROMPTS_DIR" ]]; then
  echo -e "${RED}Error: $PROMPTS_DIR not found. Run this from your project root.${NC}"
  exit 1
fi

if ! command -v claude &> /dev/null; then
  echo -e "${RED}Error: 'claude' CLI not found. Install: npm install -g @anthropic-ai/claude-code${NC}"
  exit 1
fi

mkdir -p "$REPORTS_DIR"

PROMPTS=(
  "1:P1_dead_code"
  "2:P2_testing"
  "3:P3_logic_gaps"
  "4:P4_api_integration"
  "5:P5_architecture"
  "6:P6_error_handling"
  "7:P7_ux_usability"
  "8:P8_missing_ux"
  "9:P9_performance"
  "10:P10_synthesis"
)

SKILL_CONTENT=$(cat "$SKILL_FILE")

log() {
  local msg="[$(date '+%H:%M:%S')] $1"
  echo "$msg" >> "$LOG_FILE"
  echo -e "$1"
}

run_prompt() {
  local num=$1 slug=$2
  local prompt_file="${PROMPTS_DIR}/${slug}.md"
  local report_file="${REPORTS_DIR}/${slug}.md"

  [[ ! -f "$prompt_file" ]] && { log "${RED}SKIP: ${prompt_file} not found${NC}"; return 1; }

  log "${CYAN}▶ [${num}/10] ${slug}${NC}"

  local prompt_content=$(cat "$prompt_file")

  local existing_reports=""
  for f in "$REPORTS_DIR"/P*.md; do
    [[ -f "$f" ]] && existing_reports+="- $(basename "$f")"$'\n'
  done

  local full_prompt="You are an expert security and architecture auditor analyzing the codebase in the current directory.

## Global Rules
${SKILL_CONTENT}

## Prior Reports for Cross-Reference
${existing_reports:-None yet.}

## Current Task
${prompt_content}

Begin. Explore the codebase thoroughly, then write your findings report to the path specified."

  if [[ "$DRY_RUN" == true ]]; then
    log "${YELLOW}  [DRY RUN] Would run ${slug} ($(echo "$full_prompt" | wc -c) chars)${NC}"
    return 0
  fi

  local start_time=$(date +%s)

  claude -p "$full_prompt" \
    --model "$MODEL" \
    --max-turns "$MAX_TURNS" \
    --allowedTools "Read Write Bash(find:*) Bash(grep:*) Bash(cat:*) Bash(wc:*) Bash(head:*) Bash(tail:*) Bash(ls:*) Bash(tree:*) Bash(rg:*) Bash(sed:*) Bash(awk:*) Bash(jq:*) Bash(npm:audit*) Bash(pip:audit*)" \
    2>> "$LOG_FILE" | tee -a "$LOG_FILE"

  local duration=$(( $(date +%s) - start_time ))

  if [[ -f "$report_file" ]]; then
    log "${GREEN}  ✓ ${report_file} written (${duration}s)${NC}"
  else
    log "${YELLOW}  ⚠ Report not found at ${report_file}${NC}"
  fi
}

log "${GREEN}═══ System Audit — Headless Mode ═══${NC}"
log "Model: ${MODEL} | Max turns: ${MAX_TURNS}"
echo ""

total_start=$(date +%s)

for entry in "${PROMPTS[@]}"; do
  num="${entry%%:*}"
  slug="${entry#*:}"

  [[ -n "$ONLY" && "$num" -ne "$ONLY" ]] && continue
  [[ "$num" -lt "$START_FROM" ]] && { log "${YELLOW}  SKIP P${num}${NC}"; continue; }

  run_prompt "$num" "$slug"

  [[ "$num" -lt 10 && "$DRY_RUN" == false ]] && sleep 3
done

total_duration=$(( $(date +%s) - total_start ))
echo ""
log "${GREEN}═══ Audit complete (${total_duration}s) ═══${NC}"
log "Reports: ${REPORTS_DIR}/"
log "Log: ${LOG_FILE}"
