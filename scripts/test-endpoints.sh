#!/usr/bin/env bash
#
# End-to-end CLI test script for all Basis Theory CLI endpoints.
# Exercises every command with real API calls.
#
# Usage:
#   export BT_MANAGEMENT_KEY="your_management_key"
#   export BT_API_KEY="your_private_api_key"
#   ./scripts/test-endpoints.sh
#
# Keys can also be provided via ~/.basistheory/cli.json:
#   { "managementApiKey": "...", "apiKey": "...", "apiBaseUrl": "..." }
#
# Options:
#   --json               Pass --json to all commands
#   --verbose            Print full command output
#   --section SECTION    Run only a specific section (tenants, logs, webhooks, keys, tokens, etc.)
#
# All created resources are automatically cleaned up on exit (including Ctrl-C).
#

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

JSON_FLAG=""
VERBOSE=false
SECTION=""
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
LAST_TEST_PASSED=false

BT="./bin/run"

# ─── Cleanup Tracking ──────────────────────────────────────────────────────────
# Resources created during the run are tracked here and cleaned up on exit.

# Using declare -a ensures arrays are defined (prevents unbound variable errors with set -u)
declare -a CLEANUP_INVITATIONS=()
declare -a CLEANUP_WEBHOOKS=()
declare -a CLEANUP_KEYS=()
declare -a CLEANUP_TOKENS=()
declare -a CLEANUP_TOKEN_INTENTS=()
declare -a CLEANUP_DOCUMENTS=()
declare -a CLEANUP_NETWORK_TOKENS=()
declare -a CLEANUP_REACTORS=()
declare -a CLEANUP_TEMP_FILES=()
ORIGINAL_TENANT_NAME=""
CONFIG_BACKUP=""
CONFIG_NEEDS_RESTORE=false
ORIG_MGMT_KEY_FOR_RESTORE=""
ORIG_API_KEY_FOR_RESTORE=""

cleanup() {
  echo ""
  echo -e "${BLUE}━━━ Cleanup ━━━${NC}"

  # Restore config file if needed
  if $CONFIG_NEEDS_RESTORE; then
    echo -e "  Restoring ~/.basistheory/cli.json..."
    echo "$CONFIG_BACKUP" > "$CONFIG_FILE"
    if [[ -n "$ORIG_MGMT_KEY_FOR_RESTORE" ]]; then
      export BT_MANAGEMENT_KEY="$ORIG_MGMT_KEY_FOR_RESTORE"
    fi
    if [[ -n "$ORIG_API_KEY_FOR_RESTORE" ]]; then
      export BT_API_KEY="$ORIG_API_KEY_FOR_RESTORE"
    fi
    CONFIG_NEEDS_RESTORE=false
  fi

  # Restore tenant name
  if [[ -n "$ORIGINAL_TENANT_NAME" ]]; then
    printf "  %-60s " "Restore tenant name"
    if $BT tenants update --name "$ORIGINAL_TENANT_NAME" >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed (manual restore needed)${NC}"
    fi
  fi

  local had_work=false

  # Delete resources in reverse order of dependency
  for id in ${CLEANUP_NETWORK_TOKENS[@]+"${CLEANUP_NETWORK_TOKENS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete network token $id"
    if $BT network-tokens delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_REACTORS[@]+"${CLEANUP_REACTORS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete reactor $id"
    if $BT reactors delete "$id" --yes >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_DOCUMENTS[@]+"${CLEANUP_DOCUMENTS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete document $id"
    if $BT documents delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_TOKEN_INTENTS[@]+"${CLEANUP_TOKEN_INTENTS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete token intent $id"
    if $BT token-intents delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_TOKENS[@]+"${CLEANUP_TOKENS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete token $id"
    if $BT tokens delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_KEYS[@]+"${CLEANUP_KEYS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete client key $id"
    if $BT keys delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_WEBHOOKS[@]+"${CLEANUP_WEBHOOKS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete webhook $id"
    if $BT webhooks delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  for id in ${CLEANUP_INVITATIONS[@]+"${CLEANUP_INVITATIONS[@]}"}; do
    [[ -z "$id" ]] && continue
    had_work=true
    printf "  %-60s " "Delete invitation $id"
    if $BT tenants invitations delete "$id" --force >/dev/null 2>&1; then
      echo -e "${GREEN}done${NC}"
    else
      echo -e "${YELLOW}failed${NC}"
    fi
  done

  # Remove temp files
  for f in ${CLEANUP_TEMP_FILES[@]+"${CLEANUP_TEMP_FILES[@]}"}; do
    rm -f "$f"
  done

  if ! $had_work && [[ -z "$ORIGINAL_TENANT_NAME" ]]; then
    echo -e "  ${GREEN}Nothing to clean up.${NC}"
  fi
}

trap cleanup EXIT

# ─── Parse Arguments ────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --json) JSON_FLAG="--json"; shift ;;
    --verbose) VERBOSE=true; shift ;;
    --section) SECTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Validation ─────────────────────────────────────────────────────────────────

CONFIG_FILE="$HOME/.basistheory/cli.json"

# Check for keys in env vars OR config file
HAS_MANAGEMENT_KEY=false
HAS_API_KEY=false

if [[ -n "${BT_MANAGEMENT_KEY:-}" ]]; then
  HAS_MANAGEMENT_KEY=true
elif [[ -f "$CONFIG_FILE" ]]; then
  CONFIG_MGMT_KEY=$(grep -o '"managementApiKey"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" 2>/dev/null | grep -o '"[^"]*"$' | tr -d '"' || true)
  if [[ -n "$CONFIG_MGMT_KEY" ]]; then
    HAS_MANAGEMENT_KEY=true
  fi
fi

if [[ -n "${BT_API_KEY:-}" ]]; then
  HAS_API_KEY=true
elif [[ -f "$CONFIG_FILE" ]]; then
  CONFIG_API_KEY=$(grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" 2>/dev/null | grep -o '"[^"]*"$' | tr -d '"' || true)
  if [[ -n "$CONFIG_API_KEY" ]]; then
    HAS_API_KEY=true
  fi
fi

if ! $HAS_MANAGEMENT_KEY; then
  echo -e "${RED}Error: Management key is required via BT_MANAGEMENT_KEY env var or ~/.basistheory/cli.json${NC}"
  echo "Either: export BT_MANAGEMENT_KEY=your_key"
  echo "    or: echo '{\"managementApiKey\": \"your_key\"}' > ~/.basistheory/cli.json"
  exit 1
fi

if ! $HAS_API_KEY; then
  echo -e "${YELLOW}Warning: API key not found in BT_API_KEY or ~/.basistheory/cli.json. Tokenization commands will use management key.${NC}"
fi

# ─── Helpers ────────────────────────────────────────────────────────────────────

run_test() {
  local description="$1"
  shift
  local cmd=("$@")

  printf "  %-60s " "$description"

  local output exit_code=0
  output=$("${cmd[@]}" 2>&1) || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
    if $VERBOSE; then
      echo "$output" | sed 's/^/    │ /'
    fi
    # Store last output for chaining
    LAST_OUTPUT="$output"
    LAST_TEST_PASSED=true
  elif echo "$output" | grep -qi '\[403\]\|Forbidden\|missing.permission\|Missing permission'; then
    echo -e "${YELLOW}SKIP (missing permission)${NC}"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    LAST_OUTPUT=""
    LAST_TEST_PASSED=false
  else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$output" | sed 's/^/    │ /' | head -5
    LAST_OUTPUT=""
    LAST_TEST_PASSED=false
  fi
  # Always return 0 so set -e doesn't exit the script.
  # Use LAST_TEST_PASSED for conditional chaining instead.
  return 0
}

skip_test() {
  local description="$1"
  printf "  %-60s " "$description"
  echo -e "${YELLOW}SKIP${NC}"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

section_header() {
  echo ""
  echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

should_run() {
  [[ -z "$SECTION" || "$SECTION" == "$1" ]]
}

extract_id() {
  # Extract an ID from JSON output (first "id" field found)
  local val
  val=$(echo "$LAST_OUTPUT" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"' || true)
  echo "$val"
}

extract_field() {
  local field="$1"
  local val
  val=$(echo "$LAST_OUTPUT" | grep -o "\"${field}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | grep -o '"[^"]*"$' | tr -d '"' || true)
  echo "$val"
}

# ─── Build ──────────────────────────────────────────────────────────────────────

section_header "Building CLI"
run_test "yarn build" yarn build
if ! $LAST_TEST_PASSED; then
  echo -e "${RED}Build failed. Cannot continue.${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}Starting endpoint tests...${NC}"
if [[ -n "${BT_MANAGEMENT_KEY:-}" ]]; then
  echo -e "  Management Key: ${BT_MANAGEMENT_KEY:0:10}... (env)"
elif $HAS_MANAGEMENT_KEY; then
  echo -e "  Management Key: (from ~/.basistheory/cli.json)"
fi
if [[ -n "${BT_API_KEY:-}" ]]; then
  echo -e "  API Key: ${BT_API_KEY:0:10}... (env)"
elif $HAS_API_KEY; then
  echo -e "  API Key: (from ~/.basistheory/cli.json)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG FILE
# ═══════════════════════════════════════════════════════════════════════════════

if should_run "config"; then
  section_header "Config File (~/.basistheory/cli.json)"

  run_test "Config directory exists" \
    test -d "$HOME/.basistheory"

  run_test "Config file exists after CLI init" \
    test -f "$CONFIG_FILE"

  run_test "Config file is valid JSON" \
    python3 -c "import json; json.load(open('$CONFIG_FILE'))"

  # Test that CLI reads from config file (backup and restore env vars)
  if [[ -n "${BT_MANAGEMENT_KEY:-}" ]]; then
    # Set up trap-safe restore state
    CONFIG_BACKUP=$(cat "$CONFIG_FILE")
    ORIG_MGMT_KEY_FOR_RESTORE="${BT_MANAGEMENT_KEY}"
    ORIG_API_KEY_FOR_RESTORE="${BT_API_KEY:-}"
    CONFIG_NEEDS_RESTORE=true

    # Write management key to config, unset env var, and verify CLI still works
    echo "{\"managementApiKey\": \"$BT_MANAGEMENT_KEY\"}" > "$CONFIG_FILE"
    unset BT_MANAGEMENT_KEY 2>/dev/null || true
    unset BT_API_KEY 2>/dev/null || true

    run_test "CLI reads managementApiKey from config file" \
      $BT tenants get $JSON_FLAG

    # Restore immediately (trap is a safety net)
    echo "$CONFIG_BACKUP" > "$CONFIG_FILE"
    export BT_MANAGEMENT_KEY="$ORIG_MGMT_KEY_FOR_RESTORE"
    if [[ -n "$ORIG_API_KEY_FOR_RESTORE" ]]; then
      export BT_API_KEY="$ORIG_API_KEY_FOR_RESTORE"
    fi
    CONFIG_NEEDS_RESTORE=false
  else
    skip_test "CLI reads from config file — BT_MANAGEMENT_KEY not in env to test with"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Tenants ────────────────────────────────────────────────────────────────────

if should_run "tenants"; then
  section_header "Tenants"

  run_test "Get current tenant" \
    $BT tenants get $JSON_FLAG

  # Capture original tenant name so cleanup can restore it
  if $LAST_TEST_PASSED; then
    ORIGINAL_TENANT_NAME=$(extract_field "name")
  fi

  run_test "Get tenant usage report" \
    $BT tenants usage $JSON_FLAG

  run_test "Update tenant name" \
    $BT tenants update --name "CLI Test Tenant" $JSON_FLAG

  # Members
  section_header "Tenant Members"

  run_test "List tenant members" \
    $BT tenants members $JSON_FLAG

  run_test "List tenant members (page 1, size 5)" \
    $BT tenants members --page 1 --size 5 $JSON_FLAG

  # Invitations
  section_header "Tenant Invitations"

  run_test "List tenant invitations" \
    $BT tenants invitations $JSON_FLAG

  # Clean up stale cli-test invitations from previous runs
  if $LAST_TEST_PASSED && [[ -n "$LAST_OUTPUT" ]]; then
    STALE_IDS=$(echo "$LAST_OUTPUT" | grep -o '[0-9a-f\-]\{36\}.*cli-test-' | grep -o '^[0-9a-f\-]\{36\}' || true)
    for stale_id in $STALE_IDS; do
      $BT tenants invitations delete "$stale_id" --force >/dev/null 2>&1 || true
    done
  fi

  INVITATION_ID=""
  run_test "Create tenant invitation" \
    $BT tenants invitations create --email "cli-test-$(date +%s)@example.com" --role ADMIN $JSON_FLAG
  if $LAST_TEST_PASSED; then
    INVITATION_ID=$(extract_id)
    [[ -n "$INVITATION_ID" ]] && CLEANUP_INVITATIONS+=("$INVITATION_ID")
  fi

  if [[ -n "$INVITATION_ID" ]]; then
    run_test "Resend invitation ($INVITATION_ID)" \
      $BT tenants invitations resend "$INVITATION_ID" $JSON_FLAG

    run_test "Delete invitation ($INVITATION_ID)" \
      $BT tenants invitations delete "$INVITATION_ID" --force $JSON_FLAG
    # Remove from cleanup if inline delete succeeded
    if $LAST_TEST_PASSED; then
      CLEANUP_INVITATIONS=("${CLEANUP_INVITATIONS[@]/$INVITATION_ID/}")
    fi
  fi

  # Merchants
  section_header "Tenant Merchants"

  run_test "List tenant merchants" \
    $BT tenants merchants $JSON_FLAG || true
fi

# ─── Logs ───────────────────────────────────────────────────────────────────────

if should_run "logs"; then
  section_header "Logs"

  run_test "List audit logs" \
    $BT logs $JSON_FLAG

  run_test "List logs (filtered by entity type)" \
    $BT logs --entity-type application $JSON_FLAG || true

  run_test "List log entity types" \
    $BT logs entity-types $JSON_FLAG
fi

# ─── Webhooks ───────────────────────────────────────────────────────────────────

if should_run "webhooks"; then
  section_header "Webhooks"

  run_test "List webhooks" \
    $BT webhooks $JSON_FLAG

  run_test "List webhook event types" \
    $BT webhooks events $JSON_FLAG

  WEBHOOK_ID=""
  run_test "Create webhook" \
    $BT webhooks create \
      --name "CLI Test Webhook $(date +%s)" \
      --url "https://httpbin.org/post" \
      --events "token.created" \
      --events "token.deleted" \
      $JSON_FLAG
  if $LAST_TEST_PASSED; then
    WEBHOOK_ID=$(extract_id)
    [[ -n "$WEBHOOK_ID" ]] && CLEANUP_WEBHOOKS+=("$WEBHOOK_ID")
  fi

  if [[ -n "$WEBHOOK_ID" ]]; then
    run_test "Get webhook ($WEBHOOK_ID)" \
      $BT webhooks get "$WEBHOOK_ID" $JSON_FLAG

    run_test "Update webhook ($WEBHOOK_ID)" \
      $BT webhooks update "$WEBHOOK_ID" \
        --name "CLI Test Webhook Updated" \
        --url "https://httpbin.org/post" \
        --events "token.created" \
        $JSON_FLAG

    run_test "Ping webhooks" \
      $BT webhooks ping $JSON_FLAG

    run_test "Delete webhook ($WEBHOOK_ID)" \
      $BT webhooks delete "$WEBHOOK_ID" --force $JSON_FLAG
    if $LAST_TEST_PASSED; then
      CLEANUP_WEBHOOKS=("${CLEANUP_WEBHOOKS[@]/$WEBHOOK_ID/}")
    fi
  fi
fi

# ─── Client Keys ────────────────────────────────────────────────────────────────

if should_run "keys"; then
  section_header "Client Keys"

  run_test "List client keys" \
    $BT keys $JSON_FLAG

  KEY_ID=""
  run_test "Create client key" \
    $BT keys create $JSON_FLAG
  if $LAST_TEST_PASSED; then
    KEY_ID=$(extract_field "keyId")
    [[ -z "$KEY_ID" ]] && KEY_ID=$(extract_field "key_id")
    [[ -z "$KEY_ID" ]] && KEY_ID=$(extract_id)
    [[ -n "$KEY_ID" ]] && CLEANUP_KEYS+=("$KEY_ID")
  fi

  if [[ -n "$KEY_ID" ]]; then
    run_test "Delete client key ($KEY_ID)" \
      $BT keys delete "$KEY_ID" --force $JSON_FLAG
    if $LAST_TEST_PASSED; then
      CLEANUP_KEYS=("${CLEANUP_KEYS[@]/$KEY_ID/}")
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# TOKENIZATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Tokens ─────────────────────────────────────────────────────────────────────

if should_run "tokens"; then
  section_header "Tokens"

  TOKEN_ID=""
  run_test "Create token" \
    $BT tokens create \
      --type token \
      --data '{"value": "cli-test-secret"}' \
      $JSON_FLAG
  if $LAST_TEST_PASSED; then
    TOKEN_ID=$(extract_id)
    [[ -n "$TOKEN_ID" ]] && CLEANUP_TOKENS+=("$TOKEN_ID")
  fi

  run_test "List tokens" \
    $BT tokens $JSON_FLAG

  run_test "List token types (reference)" \
    $BT tokens types $JSON_FLAG

  if [[ -n "$TOKEN_ID" ]]; then
    run_test "Get token ($TOKEN_ID)" \
      $BT tokens get "$TOKEN_ID" $JSON_FLAG

    run_test "Update token ($TOKEN_ID)" \
      $BT tokens update "$TOKEN_ID" \
        --data '{"value": "cli-test-updated"}' \
        $JSON_FLAG

    run_test "Search tokens" \
      $BT tokens search --query "type:token" $JSON_FLAG

    run_test "Delete token ($TOKEN_ID)" \
      $BT tokens delete "$TOKEN_ID" --force $JSON_FLAG
    if $LAST_TEST_PASSED; then
      CLEANUP_TOKENS=("${CLEANUP_TOKENS[@]/$TOKEN_ID/}")
    fi
  fi

  # Tokenize / Detokenize
  section_header "Tokenize / Detokenize"

  run_test "Tokenize (inline JSON)" \
    $BT tokenize --data '{"first_name": "John", "last_name": "Doe"}' $JSON_FLAG || true

  run_test "Detokenize" \
    $BT detokenize --data '{"value": "not-a-real-token"}' $JSON_FLAG || true
fi

# ─── Token Intents ──────────────────────────────────────────────────────────────

if should_run "token-intents"; then
  section_header "Token Intents"

  INTENT_ID=""
  run_test "Create token intent" \
    $BT token-intents create \
      --type card \
      --data '{"number": "4242424242424242", "expiration_month": 12, "expiration_year": 2026, "cvc": "123"}' \
      $JSON_FLAG
  if $LAST_TEST_PASSED; then
    INTENT_ID=$(extract_id)
    [[ -n "$INTENT_ID" ]] && CLEANUP_TOKEN_INTENTS+=("$INTENT_ID")
  fi

  if [[ -n "$INTENT_ID" ]]; then
    run_test "Get token intent ($INTENT_ID)" \
      $BT token-intents get "$INTENT_ID" $JSON_FLAG

    run_test "Delete token intent ($INTENT_ID)" \
      $BT token-intents delete "$INTENT_ID" --force $JSON_FLAG
    if $LAST_TEST_PASSED; then
      CLEANUP_TOKEN_INTENTS=("${CLEANUP_TOKEN_INTENTS[@]/$INTENT_ID/}")
    fi
  fi
fi

# ─── Documents ──────────────────────────────────────────────────────────────────

if should_run "documents"; then
  section_header "Documents"

  # Create a temp file to upload
  TEMP_DOC=$(mktemp /tmp/bt-cli-test-XXXXXX)
  echo "CLI test document content" > "$TEMP_DOC"
  CLEANUP_TEMP_FILES+=("$TEMP_DOC" "/tmp/bt-cli-test-download.txt")

  DOC_ID=""
  run_test "Upload document" \
    $BT documents upload --file "$TEMP_DOC" $JSON_FLAG
  if $LAST_TEST_PASSED; then
    DOC_ID=$(extract_id)
    [[ -n "$DOC_ID" ]] && CLEANUP_DOCUMENTS+=("$DOC_ID")
  fi

  if [[ -n "$DOC_ID" ]]; then
    run_test "Get document metadata ($DOC_ID)" \
      $BT documents get "$DOC_ID" $JSON_FLAG

    run_test "Download document ($DOC_ID)" \
      $BT documents download "$DOC_ID" --output /tmp/bt-cli-test-download.txt $JSON_FLAG

    run_test "Delete document ($DOC_ID)" \
      $BT documents delete "$DOC_ID" --force $JSON_FLAG
    if $LAST_TEST_PASSED; then
      CLEANUP_DOCUMENTS=("${CLEANUP_DOCUMENTS[@]/$DOC_ID/}")
    fi
  fi
fi

# ─── Invoke Reactors ───────────────────────────────────────────────────────────

if should_run "reactors-invoke"; then
  section_header "Invoke Reactors"

  # Create a simple reactor for testing
  REACTOR_CODE=$(mktemp /tmp/bt-cli-test-reactor-XXXXXX.js)
  CLEANUP_TEMP_FILES+=("$REACTOR_CODE")
  cat > "$REACTOR_CODE" << 'JSEOF'
module.exports = async function (req) {
  return { raw: { tokenId: req.args.tokenId, echo: true } };
};
JSEOF

  REACTOR_ID=""
  run_test "Create test reactor" \
    $BT reactors create \
      --name "CLI Test Reactor $(date +%s)" \
      --code "$REACTOR_CODE" \
      --image node-bt \
      --async
  if $LAST_TEST_PASSED; then
    REACTOR_ID=$(extract_id)
    [[ -n "$REACTOR_ID" ]] && CLEANUP_REACTORS+=("$REACTOR_ID")
  fi

  if [[ -n "$REACTOR_ID" ]]; then
    # Wait for reactor to be ready
    sleep 5

    run_test "Invoke reactor (sync)" \
      $BT reactors invoke "$REACTOR_ID" \
        --data '{"args": {"tokenId": "tok-test-123"}}' \
        $JSON_FLAG

    run_test "Delete test reactor ($REACTOR_ID)" \
      $BT reactors delete "$REACTOR_ID" --yes
    if $LAST_TEST_PASSED; then
      CLEANUP_REACTORS=("${CLEANUP_REACTORS[@]/$REACTOR_ID/}")
    fi
  fi
fi

# ─── Invoke Proxies ────────────────────────────────────────────────────────────

if should_run "proxies-invoke"; then
  section_header "Invoke Proxies"

  run_test "Invoke ephemeral proxy" \
    $BT proxies invoke \
      --method GET \
      --proxy-url "https://httpbin.org/get" \
      $JSON_FLAG || true
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CREDENTIAL MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Account Updater ────────────────────────────────────────────────────────────

if should_run "account-updater"; then
  section_header "Account Updater"

  run_test "List account updater jobs" \
    $BT account-updater jobs $JSON_FLAG || true

  JOB_ID=""
  run_test "Create account updater job" \
    $BT account-updater jobs create $JSON_FLAG
  if $LAST_TEST_PASSED; then
    JOB_ID=$(extract_id)
  fi

  if [[ -n "$JOB_ID" ]]; then
    run_test "Get account updater job ($JOB_ID)" \
      $BT account-updater jobs get "$JOB_ID" $JSON_FLAG || true
  fi

  echo -e "  ${YELLOW}Note: Real-time account updater requires a valid card token.${NC}"
  echo -e "  ${YELLOW}Set AU_TOKEN_ID env var to test. Skipping if not set.${NC}"

  if [[ -n "${AU_TOKEN_ID:-}" ]]; then
    run_test "Real-time account update" \
      $BT account-updater real-time \
        --token-id "$AU_TOKEN_ID" \
        $JSON_FLAG || true
  else
    skip_test "Real-time account update — AU_TOKEN_ID not set"
  fi
fi

# ─── Network Tokens ────────────────────────────────────────────────────────────

if should_run "network-tokens"; then
  section_header "[Beta] Network Tokens"

  echo -e "  ${YELLOW}Note: Network token operations require valid card tokens.${NC}"
  echo -e "  ${YELLOW}Set NT_TOKEN_ID env var to test creation. Skipping if not set.${NC}"

  if [[ -n "${NT_TOKEN_ID:-}" ]]; then
    NT_ID=""
    run_test "Create network token" \
      $BT network-tokens create --token-id "$NT_TOKEN_ID" $JSON_FLAG
    if $LAST_TEST_PASSED; then
      NT_ID=$(extract_id)
      [[ -n "$NT_ID" ]] && CLEANUP_NETWORK_TOKENS+=("$NT_ID")
    fi

    if [[ -n "$NT_ID" ]]; then
      run_test "Get network token ($NT_ID)" \
        $BT network-tokens get "$NT_ID" $JSON_FLAG

      run_test "Generate cryptogram ($NT_ID)" \
        $BT network-tokens cryptogram "$NT_ID" $JSON_FLAG

      run_test "Suspend network token ($NT_ID)" \
        $BT network-tokens suspend "$NT_ID" $JSON_FLAG

      run_test "Resume network token ($NT_ID)" \
        $BT network-tokens resume "$NT_ID" $JSON_FLAG

      run_test "Delete network token ($NT_ID)" \
        $BT network-tokens delete "$NT_ID" --force $JSON_FLAG
      if $LAST_TEST_PASSED; then
        CLEANUP_NETWORK_TOKENS=("${CLEANUP_NETWORK_TOKENS[@]/$NT_ID/}")
      fi
    fi
  else
    skip_test "Create network token — NT_TOKEN_ID not set"
    skip_test "Get/cryptogram/suspend/resume/delete — skipped"
  fi
fi

# ─── 3DS Sessions ──────────────────────────────────────────────────────────────

if should_run "3ds"; then
  section_header "[Beta] 3DS Sessions"

  echo -e "  ${YELLOW}Note: 3DS requires a valid card token or token intent.${NC}"
  echo -e "  ${YELLOW}Set THREEDS_TOKEN_ID env var to test. Skipping if not set.${NC}"

  if [[ -n "${THREEDS_TOKEN_ID:-}" ]]; then
    SESSION_ID=""
    run_test "Create 3DS session" \
      $BT 3ds sessions create --token-id "$THREEDS_TOKEN_ID" $JSON_FLAG
    if $LAST_TEST_PASSED; then
      SESSION_ID=$(extract_id)
    fi

    if [[ -n "$SESSION_ID" ]]; then
      run_test "Get 3DS session ($SESSION_ID)" \
        $BT 3ds sessions get "$SESSION_ID" $JSON_FLAG

      run_test "Authenticate 3DS session ($SESSION_ID)" \
        $BT 3ds sessions authenticate "$SESSION_ID" \
          --data '{"authentication_category": "payment", "authentication_type": "payment-transaction"}' \
          $JSON_FLAG || true

      run_test "Get challenge result ($SESSION_ID)" \
        $BT 3ds sessions challenge-result "$SESSION_ID" $JSON_FLAG || true
    fi
  else
    skip_test "Create 3DS session — THREEDS_TOKEN_ID not set"
    skip_test "Get/authenticate/challenge-result — skipped"
  fi
fi

# ─── Enrichments ────────────────────────────────────────────────────────────────

if should_run "enrichments"; then
  section_header "[Beta] Enrichments"

  echo -e "  ${YELLOW}Note: Bank account verification requires a valid bank token.${NC}"
  echo -e "  ${YELLOW}Set BANK_TOKEN_ID env var to test. Skipping if not set.${NC}"

  if [[ -n "${BANK_TOKEN_ID:-}" ]]; then
    run_test "Verify bank account" \
      $BT enrichments bank-account-verify \
        --token-id "$BANK_TOKEN_ID" \
        --country-code US \
        $JSON_FLAG || true
  else
    skip_test "Verify bank account — BANK_TOKEN_ID not set"
  fi
fi

# ─── Apple Pay ──────────────────────────────────────────────────────────────────

if should_run "apple-pay"; then
  section_header "[Beta] Apple Pay"

  run_test "List Apple Pay domains" \
    $BT apple-pay domains $JSON_FLAG || true

  echo -e "  ${YELLOW}Note: Apple Pay tokenization requires real payment data.${NC}"
  echo -e "  ${YELLOW}Domain/merchant/certificate operations require apple-pay:manage permission.${NC}"

  # Domain registration (safe to test)
  run_test "Register Apple Pay domain" \
    $BT apple-pay domains register --domain "cli-test.example.com" $JSON_FLAG || true

  run_test "Deregister Apple Pay domain" \
    $BT apple-pay domains deregister --domain "cli-test.example.com" $JSON_FLAG || true
fi

# ─── Google Pay ─────────────────────────────────────────────────────────────────

if should_run "google-pay"; then
  section_header "[Beta] Google Pay"

  echo -e "  ${YELLOW}Note: Google Pay operations require real payment data and merchant setup.${NC}"
  echo -e "  ${YELLOW}Most operations will fail without proper configuration.${NC}"

  # These will likely fail without proper setup, but tests the CLI wiring
  run_test "Create Google Pay merchant" \
    $BT google-pay merchants create --merchant-identifier "cli-test-merchant" $JSON_FLAG || true
fi

# ─── Connections ────────────────────────────────────────────────────────────────

if should_run "connections"; then
  section_header "Connections (Stripe Forward)"

  echo -e "  ${YELLOW}Note: Stripe Forward requires a configured Stripe connection.${NC}"
  echo -e "  ${YELLOW}Skipping unless STRIPE_FORWARD_TEST=true is set.${NC}"

  if [[ "${STRIPE_FORWARD_TEST:-}" == "true" ]]; then
    run_test "Stripe Forward tokenize" \
      $BT connections stripe-forward tokenize \
        --data '{"number": "4242424242424242", "exp_month": "12", "exp_year": "2026", "cvc": "123"}' \
        $JSON_FLAG || true
  else
    skip_test "Stripe Forward tokenize — STRIPE_FORWARD_TEST not set"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# MANAGEMENT LISTING (Smoke Tests)
# ═══════════════════════════════════════════════════════════════════════════════

if should_run "existing"; then
  section_header "Management Listings"

  run_test "List applications" \
    $BT applications $JSON_FLAG

  run_test "List reactors" \
    $BT reactors $JSON_FLAG

  run_test "List proxies" \
    $BT proxies $JSON_FLAG
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━ Results ━━━${NC}"
echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
echo -e "  ${GREEN}Passed:  $PASS_COUNT${NC}"
echo -e "  ${RED}Failed:  $FAIL_COUNT${NC}"
echo -e "  ${YELLOW}Skipped: $SKIP_COUNT${NC}"
echo -e "  Total:   $TOTAL"
echo ""

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
