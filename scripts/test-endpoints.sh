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
# Options:
#   --skip-destructive   Skip delete/destroy operations
#   --json               Pass --json to all commands
#   --verbose            Print full command output
#   --section SECTION    Run only a specific section (tenants, logs, webhooks, keys, tokens, etc.)
#

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SKIP_DESTRUCTIVE=false
JSON_FLAG=""
VERBOSE=false
SECTION=""
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

BT="./bin/run"

# ─── Parse Arguments ────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-destructive) SKIP_DESTRUCTIVE=true; shift ;;
    --json) JSON_FLAG="--json"; shift ;;
    --verbose) VERBOSE=true; shift ;;
    --section) SECTION="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ─── Validation ─────────────────────────────────────────────────────────────────

if [[ -z "${BT_MANAGEMENT_KEY:-}" ]]; then
  echo -e "${RED}Error: BT_MANAGEMENT_KEY environment variable is required${NC}"
  echo "Export it before running: export BT_MANAGEMENT_KEY=your_key"
  exit 1
fi

if [[ -z "${BT_API_KEY:-}" ]]; then
  echo -e "${YELLOW}Warning: BT_API_KEY not set. Tokenization commands will use BT_MANAGEMENT_KEY.${NC}"
fi

# ─── Helpers ────────────────────────────────────────────────────────────────────

run_test() {
  local description="$1"
  shift
  local cmd=("$@")

  printf "  %-60s " "$description"

  local output
  if output=$("${cmd[@]}" 2>&1); then
    echo -e "${GREEN}PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
    if $VERBOSE; then
      echo "$output" | sed 's/^/    │ /'
    fi
    # Store last output for chaining
    LAST_OUTPUT="$output"
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "$output" | sed 's/^/    │ /' | head -5
    LAST_OUTPUT=""
    return 1
  fi
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
  echo "$LAST_OUTPUT" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"'
}

extract_field() {
  local field="$1"
  echo "$LAST_OUTPUT" | grep -o "\"${field}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | grep -o '"[^"]*"$' | tr -d '"'
}

# ─── Build ──────────────────────────────────────────────────────────────────────

section_header "Building CLI"
run_test "yarn build" yarn build

echo ""
echo -e "${BLUE}Starting endpoint tests...${NC}"
echo -e "  Management Key: ${BT_MANAGEMENT_KEY:0:10}..."
if [[ -n "${BT_API_KEY:-}" ]]; then
  echo -e "  API Key: ${BT_API_KEY:0:10}..."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Tenants ────────────────────────────────────────────────────────────────────

if should_run "tenants"; then
  section_header "Tenants"

  run_test "Get current tenant" \
    $BT tenants get $JSON_FLAG

  run_test "Get tenant usage report" \
    $BT tenants usage $JSON_FLAG

  run_test "Update tenant name" \
    $BT tenants update --name "CLI Test Tenant" $JSON_FLAG || true

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

  INVITATION_ID=""
  if run_test "Create tenant invitation" \
    $BT tenants invitations create --email "cli-test-$(date +%s)@example.com" --role ADMIN $JSON_FLAG; then
    INVITATION_ID=$(extract_id)
  fi

  if [[ -n "$INVITATION_ID" ]]; then
    run_test "Resend invitation ($INVITATION_ID)" \
      $BT tenants invitations resend "$INVITATION_ID" $JSON_FLAG || true

    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete invitation ($INVITATION_ID)" \
        $BT tenants invitations delete "$INVITATION_ID" --force $JSON_FLAG
    else
      skip_test "Delete invitation (--skip-destructive)"
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
  if run_test "Create webhook" \
    $BT webhooks create \
      --name "CLI Test Webhook $(date +%s)" \
      --url "https://httpbin.org/post" \
      --events "token.created" \
      --events "token.deleted" \
      $JSON_FLAG; then
    WEBHOOK_ID=$(extract_id)
  fi

  if [[ -n "$WEBHOOK_ID" ]]; then
    run_test "Get webhook ($WEBHOOK_ID)" \
      $BT webhooks get "$WEBHOOK_ID" $JSON_FLAG

    run_test "Update webhook ($WEBHOOK_ID)" \
      $BT webhooks update "$WEBHOOK_ID" \
        --name "CLI Test Webhook Updated" \
        --url "https://httpbin.org/post" \
        --events "token.created" \
        $JSON_FLAG || true

    run_test "Ping webhooks" \
      $BT webhooks ping $JSON_FLAG || true

    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete webhook ($WEBHOOK_ID)" \
        $BT webhooks delete "$WEBHOOK_ID" --force $JSON_FLAG
    else
      skip_test "Delete webhook (--skip-destructive)"
    fi
  fi
fi

# ─── Client Keys ────────────────────────────────────────────────────────────────

if should_run "keys"; then
  section_header "Client Keys"

  run_test "List client keys" \
    $BT keys $JSON_FLAG

  KEY_ID=""
  if run_test "Create client key" \
    $BT keys create $JSON_FLAG; then
    KEY_ID=$(extract_field "keyId") || KEY_ID=$(extract_field "key_id") || KEY_ID=$(extract_id)
  fi

  if [[ -n "$KEY_ID" ]]; then
    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete client key ($KEY_ID)" \
        $BT keys delete "$KEY_ID" --force $JSON_FLAG
    else
      skip_test "Delete client key (--skip-destructive)"
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
  if run_test "Create token" \
    $BT tokens create \
      --type token \
      --data '{"value": "cli-test-secret"}' \
      $JSON_FLAG; then
    TOKEN_ID=$(extract_id)
  fi

  run_test "List tokens" \
    $BT tokens $JSON_FLAG

  run_test "List token types (reference)" \
    $BT tokens types $JSON_FLAG || true

  if [[ -n "$TOKEN_ID" ]]; then
    run_test "Get token ($TOKEN_ID)" \
      $BT tokens get "$TOKEN_ID" $JSON_FLAG

    run_test "Update token ($TOKEN_ID)" \
      $BT tokens update "$TOKEN_ID" \
        --data '{"value": "cli-test-updated"}' \
        $JSON_FLAG || true

    run_test "Search tokens" \
      $BT tokens search --query "type:token" $JSON_FLAG || true

    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete token ($TOKEN_ID)" \
        $BT tokens delete "$TOKEN_ID" --force $JSON_FLAG
    else
      skip_test "Delete token (--skip-destructive)"
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
  if run_test "Create token intent" \
    $BT token-intents create \
      --type card \
      --data '{"number": "4242424242424242", "expiration_month": 12, "expiration_year": 2026, "cvc": "123"}' \
      $JSON_FLAG; then
    INTENT_ID=$(extract_id)
  fi

  if [[ -n "$INTENT_ID" ]]; then
    run_test "Get token intent ($INTENT_ID)" \
      $BT token-intents get "$INTENT_ID" $JSON_FLAG

    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete token intent ($INTENT_ID)" \
        $BT token-intents delete "$INTENT_ID" --force $JSON_FLAG
    else
      skip_test "Delete token intent (--skip-destructive)"
    fi
  fi
fi

# ─── Documents ──────────────────────────────────────────────────────────────────

if should_run "documents"; then
  section_header "Documents"

  # Create a temp file to upload
  TEMP_DOC=$(mktemp /tmp/bt-cli-test-XXXXXX.txt)
  echo "CLI test document content" > "$TEMP_DOC"

  DOC_ID=""
  if run_test "Upload document" \
    $BT documents upload --file "$TEMP_DOC" $JSON_FLAG; then
    DOC_ID=$(extract_id)
  fi

  if [[ -n "$DOC_ID" ]]; then
    run_test "Get document metadata ($DOC_ID)" \
      $BT documents get "$DOC_ID" $JSON_FLAG

    run_test "Download document ($DOC_ID)" \
      $BT documents download "$DOC_ID" --output /tmp/bt-cli-test-download.txt $JSON_FLAG || true

    if ! $SKIP_DESTRUCTIVE; then
      run_test "Delete document ($DOC_ID)" \
        $BT documents delete "$DOC_ID" --force $JSON_FLAG
    else
      skip_test "Delete document (--skip-destructive)"
    fi
  fi

  rm -f "$TEMP_DOC" /tmp/bt-cli-test-download.txt
fi

# ─── Invoke Reactors ───────────────────────────────────────────────────────────

if should_run "reactors-invoke"; then
  section_header "Invoke Reactors"

  echo -e "  ${YELLOW}Note: Reactor invoke tests require an existing reactor ID.${NC}"
  echo -e "  ${YELLOW}Set REACTOR_ID env var to test. Skipping if not set.${NC}"

  if [[ -n "${REACTOR_ID:-}" ]]; then
    run_test "Invoke reactor (sync)" \
      $BT reactors invoke "$REACTOR_ID" \
        --data '{"args": {"test": true}}' \
        $JSON_FLAG || true

    ASYNC_REQUEST_ID=""
    if run_test "Invoke reactor (async)" \
      $BT reactors invoke-async "$REACTOR_ID" \
        --data '{"args": {"test": true}}' \
        $JSON_FLAG; then
      ASYNC_REQUEST_ID=$(extract_field "asyncReactorRequestId")
    fi

    if [[ -n "$ASYNC_REQUEST_ID" ]]; then
      sleep 2
      run_test "Get async reactor result" \
        $BT reactors get-result "$REACTOR_ID" "$ASYNC_REQUEST_ID" $JSON_FLAG || true
    fi
  else
    skip_test "Invoke reactor (sync) — REACTOR_ID not set"
    skip_test "Invoke reactor (async) — REACTOR_ID not set"
    skip_test "Get async result — REACTOR_ID not set"
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
  if run_test "Create account updater job" \
    $BT account-updater jobs create $JSON_FLAG; then
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
  section_header "Network Tokens"

  echo -e "  ${YELLOW}Note: Network token operations require valid card tokens.${NC}"
  echo -e "  ${YELLOW}Set NT_TOKEN_ID env var to test creation. Skipping if not set.${NC}"

  if [[ -n "${NT_TOKEN_ID:-}" ]]; then
    NT_ID=""
    if run_test "Create network token" \
      $BT network-tokens create --token-id "$NT_TOKEN_ID" $JSON_FLAG; then
      NT_ID=$(extract_id)
    fi

    if [[ -n "$NT_ID" ]]; then
      run_test "Get network token ($NT_ID)" \
        $BT network-tokens get "$NT_ID" $JSON_FLAG

      run_test "Generate cryptogram ($NT_ID)" \
        $BT network-tokens cryptogram "$NT_ID" $JSON_FLAG || true

      run_test "Suspend network token ($NT_ID)" \
        $BT network-tokens suspend "$NT_ID" $JSON_FLAG || true

      run_test "Resume network token ($NT_ID)" \
        $BT network-tokens resume "$NT_ID" $JSON_FLAG || true

      if ! $SKIP_DESTRUCTIVE; then
        run_test "Delete network token ($NT_ID)" \
          $BT network-tokens delete "$NT_ID" --force $JSON_FLAG
      else
        skip_test "Delete network token (--skip-destructive)"
      fi
    fi
  else
    skip_test "Create network token — NT_TOKEN_ID not set"
    skip_test "Get/cryptogram/suspend/resume/delete — skipped"
  fi
fi

# ─── 3DS Sessions ──────────────────────────────────────────────────────────────

if should_run "3ds"; then
  section_header "3DS Sessions"

  echo -e "  ${YELLOW}Note: 3DS requires a valid card token or token intent.${NC}"
  echo -e "  ${YELLOW}Set THREEDS_TOKEN_ID env var to test. Skipping if not set.${NC}"

  if [[ -n "${THREEDS_TOKEN_ID:-}" ]]; then
    SESSION_ID=""
    if run_test "Create 3DS session" \
      $BT 3ds sessions create --token-id "$THREEDS_TOKEN_ID" $JSON_FLAG; then
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
  section_header "Enrichments"

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
  section_header "Apple Pay"

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
  section_header "Google Pay"

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
# EXISTING ENDPOINTS (Smoke Tests)
# ═══════════════════════════════════════════════════════════════════════════════

if should_run "existing"; then
  section_header "Existing Endpoints (Smoke Tests)"

  run_test "List applications" \
    $BT applications --page 1

  run_test "List reactors" \
    $BT reactors --page 1

  run_test "List proxies" \
    $BT proxies --page 1
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
