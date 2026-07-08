# Basis Theory CLI - Manual Testing & Usage Guide

## Prerequisites

- Node.js >= 12
- A Basis Theory account with:
  - **Management API Key** — for management operations (tenants, applications, reactors, proxies, webhooks, logs, keys)
  - **Private API Key** — for tokenization operations (tokens, tokenize, detokenize, proxy invoke, reactor invoke, documents, payments, etc.)

```bash
# Install dependencies and build
yarn install
yarn build

# Set environment variables
export BT_MANAGEMENT_KEY="your_management_key_here"
export BT_API_KEY="your_private_api_key_here"
```

---

## Automated Test Script

A comprehensive test script exercises all CLI endpoints against the live API:

```bash
# Run all tests
./scripts/test-endpoints.sh

# Skip destructive operations (delete/destroy)
./scripts/test-endpoints.sh --skip-destructive

# Output all commands as JSON
./scripts/test-endpoints.sh --json

# See full command output
./scripts/test-endpoints.sh --verbose

# Test a specific section only
./scripts/test-endpoints.sh --section tenants
./scripts/test-endpoints.sh --section tokens
./scripts/test-endpoints.sh --section webhooks
```

### Available Sections

| Section | Description |
|---------|-------------|
| `tenants` | Tenant get/update, members, invitations, merchants |
| `logs` | Audit logs, entity types |
| `webhooks` | Webhook CRUD, events, ping |
| `keys` | Client encryption keys |
| `tokens` | Token CRUD, tokenize, detokenize |
| `token-intents` | Token intent lifecycle |
| `documents` | Document upload/download |
| `reactors-invoke` | Reactor invocation (requires `REACTOR_ID`) |
| `proxies-invoke` | Proxy invocation |
| `account-updater` | Batch jobs, real-time updates |
| `network-tokens` | Network token lifecycle (requires `NT_TOKEN_ID`) |
| `3ds` | 3DS sessions (requires `THREEDS_TOKEN_ID`) |
| `enrichments` | Bank account verification (requires `BANK_TOKEN_ID`) |
| `apple-pay` | Apple Pay domains, merchants |
| `google-pay` | Google Pay merchants |
| `connections` | Stripe Forward (requires `STRIPE_FORWARD_TEST=true`) |
| `existing` | Smoke tests for existing commands |

### Extra Environment Variables for Advanced Tests

Some tests require pre-existing resources:

```bash
export REACTOR_ID="your_reactor_id"        # For reactor invoke tests
export AU_TOKEN_ID="your_card_token_id"    # For real-time account updater
export NT_TOKEN_ID="your_card_token_id"    # For network token tests
export THREEDS_TOKEN_ID="your_card_token"  # For 3DS session tests
export BANK_TOKEN_ID="your_bank_token"     # For bank account verification
export STRIPE_FORWARD_TEST=true            # Enable Stripe Forward tests
```

---

## Command Reference & Usage Examples

### Global Flags

All commands support these flags:

| Flag | Env Var | Description |
|------|---------|-------------|
| `--management-key`, `-x` | `BT_MANAGEMENT_KEY` | Management API key (required for management commands) |
| `--api-key`, `-k` | `BT_API_KEY` | Private API key (for tokenization commands) |
| `--json` | — | Output results as raw JSON |
| `--api-base-url` | `BT_API_BASE_URL` | Override API base URL (hidden) |

---

## Management Endpoints

### Tenants

```bash
# Get current tenant
bt tenants get
bt tenants get --json

# Update tenant
bt tenants update --name "My Tenant"
bt tenants update --fingerprint-tokens true --deduplicate-tokens true

# Delete tenant (dangerous!)
bt tenants delete
bt tenants delete --force

# Get usage report
bt tenants usage
bt tenants usage --json
```

### Tenant Members

```bash
# List members
bt tenants members
bt tenants members --page 1 --size 10
bt tenants members --user-id "user-uuid-here"
bt tenants members --json

# Update member role
bt tenants members update MEMBER_ID --role ADMIN
bt tenants members update MEMBER_ID --role READ_ONLY

# Remove member
bt tenants members delete MEMBER_ID
bt tenants members delete MEMBER_ID --force
```

### Tenant Invitations

```bash
# List invitations
bt tenants invitations
bt tenants invitations --page 1 --size 10

# Create invitation
bt tenants invitations create --email "user@example.com"
bt tenants invitations create --email "user@example.com" --role READ_ONLY

# Resend invitation
bt tenants invitations resend INVITATION_ID

# Delete invitation
bt tenants invitations delete INVITATION_ID
bt tenants invitations delete INVITATION_ID --force
```

### Tenant Merchants

```bash
# List merchants (read-only)
bt tenants merchants
bt tenants merchants --page 1 --size 10
```

### Audit Logs

```bash
# List logs
bt logs
bt logs --entity-type token
bt logs --entity-type application --entity-id "app-uuid"
bt logs --start-date "2024-01-01T00:00:00Z" --end-date "2024-12-31T23:59:59Z"
bt logs --json

# List available entity types
bt logs entity-types
```

### Webhooks

```bash
# List webhooks
bt webhooks
bt webhooks --json

# Get webhook details
bt webhooks get WEBHOOK_ID

# Create webhook
bt webhooks create \
  --name "Payment Notifications" \
  --url "https://example.com/webhook" \
  --events "token.created" \
  --events "token.deleted" \
  --notify-email "admin@example.com"

# Update webhook
bt webhooks update WEBHOOK_ID \
  --name "Updated Webhook" \
  --url "https://example.com/webhook-v2" \
  --events "token.created" \
  --status enabled

# Delete webhook
bt webhooks delete WEBHOOK_ID
bt webhooks delete WEBHOOK_ID --force

# List available event types
bt webhooks events

# Ping (test delivery)
bt webhooks ping
```

### Client Encryption Keys

```bash
# List keys
bt keys
bt keys --json

# Create key (with optional expiration)
bt keys create
bt keys create --expires-at "2025-06-01T00:00:00Z"

# Delete key
bt keys delete KEY_ID
bt keys delete KEY_ID --force
```

---

## Tokenization Endpoints

### Tokens

```bash
# List tokens
bt tokens
bt tokens --type card
bt tokens --container "/pci/high/"
bt tokens --fingerprint "abc123"
bt tokens --size 50
bt tokens --json

# Get token
bt tokens get TOKEN_ID
bt tokens get TOKEN_ID --json

# Create token (inline JSON)
bt tokens create --type token --data '{"value": "sensitive-data"}'

# Create card token
bt tokens create \
  --type card \
  --data '{"number": "4242424242424242", "expiration_month": 12, "expiration_year": 2025, "cvc": "123"}'

# Create token from file
bt tokens create --type token --file ./token-data.json

# Create token with metadata
bt tokens create \
  --type token \
  --data '{"value": "test"}' \
  --metadata "user_id=12345" \
  --metadata "source=cli" \
  --container "/general/high/"

# Create token with deduplication
bt tokens create --type card --data '...' --deduplicate --fingerprint-expression '{{ data.number }}'

# Create from token intent
bt tokens create --token-intent-id INTENT_ID

# Update token
bt tokens update TOKEN_ID --data '{"value": "updated-data"}'
bt tokens update TOKEN_ID --metadata "status=verified" --expires-at "2025-12-31T00:00:00Z"

# Delete token
bt tokens delete TOKEN_ID
bt tokens delete TOKEN_ID --force

# Search tokens (Lucene syntax)
bt tokens search --query "type:card"
bt tokens search --query 'data:4242' --size 50
bt tokens search --query 'metadata.user_id:12345'
bt tokens search --query 'container:"/pci/"'

# List available token types
bt tokens types
```

### Tokenize (Batch)

```bash
# Tokenize inline JSON
bt tokenize --data '{"first_name": "John", "last_name": "Doe"}'

# Tokenize from file
bt tokenize --file ./data-to-tokenize.json

# Tokenize with typed tokens
bt tokenize --data '{
  "card": {
    "type": "card",
    "data": {
      "number": "4242424242424242",
      "expiration_month": 12,
      "expiration_year": 2025
    }
  },
  "ssn": {
    "type": "social_security_number",
    "data": "123-45-6789"
  }
}'
```

### Detokenize

```bash
# Detokenize with token expressions
bt detokenize --data '{"card_number": "{{ TOKEN_ID | json: \"$.number\" }}"}'

# Detokenize from file
bt detokenize --file ./detokenize-request.json

# Full token detokenization
bt detokenize --data '{"tokens": ["{{ token: TOKEN_ID }}"]}'
```

### Token Intents

```bash
# Create token intent (card)
bt token-intents create \
  --type card \
  --data '{"number": "4242424242424242", "expiration_month": 12, "expiration_year": 2026, "cvc": "123"}'

# Get token intent
bt token-intents get INTENT_ID

# Delete token intent
bt token-intents delete INTENT_ID
bt token-intents delete INTENT_ID --force
```

### Documents

```bash
# Upload document
bt documents upload --file ./document.pdf
bt documents upload --file ./document.pdf --metadata "type=invoice" --metadata "customer_id=123"

# Get document metadata
bt documents get DOCUMENT_ID

# Download document
bt documents download DOCUMENT_ID
bt documents download DOCUMENT_ID --output ./downloaded-file.pdf

# Delete document
bt documents delete DOCUMENT_ID
bt documents delete DOCUMENT_ID --force
```

### Invoke Proxies

```bash
# Invoke ephemeral proxy (forward request to destination)
bt proxies invoke \
  --method POST \
  --proxy-url "https://api.example.com/charges" \
  --data '{"amount": 1000, "card": "{{ TOKEN_ID }}"}'

# Invoke ephemeral proxy (GET)
bt proxies invoke \
  --method GET \
  --proxy-url "https://api.example.com/status"

# Invoke pre-configured proxy
bt proxies invoke \
  --proxy-key "PROXY_KEY" \
  --data '{"amount": 1000}' \
  --path "charges"

# With custom path appended
bt proxies invoke \
  --method PUT \
  --proxy-url "https://api.example.com" \
  --path "customers/123" \
  --data '{"name": "Updated Name"}'
```

### Invoke Reactors

```bash
# Invoke reactor (synchronous)
bt reactors invoke REACTOR_ID --data '{"key": "value"}'
bt reactors invoke REACTOR_ID --file ./reactor-input.json

# Invoke reactor (asynchronous)
bt reactors invoke-async REACTOR_ID --data '{"key": "value"}'
# Returns: asyncReactorRequestId

# Get async result
bt reactors get-result REACTOR_ID REQUEST_ID
```

---

## Payment Endpoints

### Apple Pay

```bash
# Tokenize Apple Pay payment
bt apple-pay create --file ./apple-pay-token.json
bt apple-pay create \
  --data '{"paymentData": {...}, "paymentMethod": {...}}' \
  --expires-at "2025-12-31T00:00:00Z" \
  --merchant-registration-id MERCHANT_ID

# Get Apple Pay token
bt apple-pay get APPLE_PAY_TOKEN_ID

# Delete Apple Pay token
bt apple-pay delete APPLE_PAY_TOKEN_ID --force

# Create merchant session
bt apple-pay session \
  --display-name "My Store" \
  --domain "mystore.example.com"

# Domain management
bt apple-pay domains                                      # List domains
bt apple-pay domains register --domain "shop.example.com" # Register
bt apple-pay domains deregister --domain "shop.example.com" # Deregister

# Merchant registration
bt apple-pay merchants create --merchant-identifier "merchant.com.example"
bt apple-pay merchants get MERCHANT_ID
bt apple-pay merchants delete MERCHANT_ID --force

# Merchant certificates
bt apple-pay merchants certificates create MERCHANT_ID \
  --merchant-cert ./merchant.p12 \
  --merchant-cert-password "password" \
  --processor-cert ./processor.p12 \
  --processor-cert-password "password" \
  --domain "shop.example.com"
bt apple-pay merchants certificates get MERCHANT_ID CERT_ID
bt apple-pay merchants certificates delete MERCHANT_ID CERT_ID --force
```

### Google Pay

```bash
# Tokenize Google Pay payment
bt google-pay create --file ./google-pay-token.json
bt google-pay create \
  --data '{"protocolVersion": "...", "signature": "...", "signedMessage": "..."}' \
  --merchant-registration-id MERCHANT_ID

# Get / Delete Google Pay token
bt google-pay get GOOGLE_PAY_TOKEN_ID
bt google-pay delete GOOGLE_PAY_TOKEN_ID --force

# Merchant registration
bt google-pay merchants create --merchant-identifier "merchant-id"
bt google-pay merchants get MERCHANT_ID
bt google-pay merchants delete MERCHANT_ID --force

# Merchant certificates
bt google-pay merchants certificates create MERCHANT_ID \
  --merchant-cert ./merchant.p12 \
  --merchant-cert-password "password"
bt google-pay merchants certificates get MERCHANT_ID CERT_ID
bt google-pay merchants certificates delete MERCHANT_ID CERT_ID --force
```

---

## Credential Management Endpoints

### Account Updater

```bash
# List batch jobs
bt account-updater jobs
bt account-updater jobs --size 50

# Create batch job (returns upload URL)
bt account-updater jobs create

# Get job status
bt account-updater jobs get JOB_ID

# Real-time account update
bt account-updater real-time \
  --token-id CARD_TOKEN_ID \
  --expiration-month 12 \
  --expiration-year 2026 \
  --deduplicate-token
```

### Network Tokens

```bash
# Create network token (from existing card token)
bt network-tokens create --token-id CARD_TOKEN_ID

# Create network token (from token intent)
bt network-tokens create --token-intent-id INTENT_ID

# Create network token (from raw card data)
bt network-tokens create --data '{"number": "4242424242424242", "expirationMonth": "12", "expirationYear": "2025"}'

# Get network token
bt network-tokens get NETWORK_TOKEN_ID

# Generate cryptogram
bt network-tokens cryptogram NETWORK_TOKEN_ID

# Suspend / Resume
bt network-tokens suspend NETWORK_TOKEN_ID
bt network-tokens resume NETWORK_TOKEN_ID

# Delete
bt network-tokens delete NETWORK_TOKEN_ID --force
```

### 3DS Sessions

```bash
# Create 3DS session
bt 3ds sessions create --token-id CARD_TOKEN_ID
bt 3ds sessions create --token-intent-id INTENT_ID --type customer --device browser

# Create with full request JSON
bt 3ds sessions create --file ./3ds-session-request.json

# Get session
bt 3ds sessions get SESSION_ID

# Authenticate session
bt 3ds sessions authenticate SESSION_ID \
  --data '{
    "authentication_category": "payment",
    "authentication_type": "payment-transaction",
    "purchase_info": {"amount": "1000", "currency": "USD"},
    "cardholder_info": {"name": "John Doe", "email": "john@example.com"}
  }'

# Get challenge result
bt 3ds sessions challenge-result SESSION_ID
```

### Enrichments

```bash
# Verify bank account
bt enrichments bank-account-verify --token-id BANK_TOKEN_ID
bt enrichments bank-account-verify --token-id BANK_TOKEN_ID --country-code US --routing-number "021000021"
```

### Connections (Stripe Forward)

```bash
# Tokenize card via Stripe Forward
bt connections stripe-forward tokenize \
  --data '{"number": "4242424242424242", "exp_month": "12", "exp_year": "2026", "cvc": "123", "name": "John Doe"}'

bt connections stripe-forward tokenize --file ./card-data.json
```

---

## Scripting & Automation

### JSON Output for Scripting

All commands support `--json` for machine-readable output:

```bash
# Create token and capture ID
TOKEN_ID=$(bt tokens create --type token --data '{"value": "test"}' --json | jq -r '.id')
echo "Created token: $TOKEN_ID"

# List and process tokens
bt tokens --json | jq '.[] | {id, type}'

# Create webhook and get ID
WEBHOOK_ID=$(bt webhooks create --name "My Hook" --url "https://example.com" --events "token.created" --json | jq -r '.id')
```

### Using with Environment Variables

```bash
# Use different keys for different operations
BT_MANAGEMENT_KEY=mgmt_key bt tenants get
BT_API_KEY=private_key bt tokens create --type token --data '{"x":"y"}'

# Override API base URL (for testing)
BT_API_BASE_URL=https://api-staging.basistheory.com bt tenants get
```

### Piping and Composition

```bash
# Create a token and immediately get its details
TOKEN_ID=$(bt tokens create --type token --data '{"secret": "value"}' --json | jq -r '.id')
bt tokens get "$TOKEN_ID" --json | jq '.data'

# Batch operations with xargs
echo -e "tok-1\ntok-2\ntok-3" | xargs -I {} bt tokens delete {} --force

# Export webhook events to file
bt webhooks events --json > event-types.json
```

---

## Troubleshooting

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required flag: --management-key` | No API key provided | Set `BT_MANAGEMENT_KEY` env var |
| `Unauthorized [401]` | Invalid or expired API key | Check key permissions in the portal |
| `Forbidden [403]` | Key lacks required permissions | Add the needed permission to your application |
| `Not Found [404]` | Resource doesn't exist | Verify the ID is correct |
| `Either --api-key or --management-key must be provided` | Tokenization command without key | Set `BT_API_KEY` or `BT_MANAGEMENT_KEY` |

### Debug Mode

```bash
# Enable debug logging
DEBUG=* bt tenants get

# Debug specific modules
DEBUG=applications:management bt applications
```

---

## Unit Tests

Run the full unit test suite:

```bash
yarn test
```

Run specific test files:

```bash
# All tenant tests
yarn test test/unit/commands/tenants/**/*.test.ts

# Specific command test
yarn test test/unit/commands/webhooks/create.test.ts

# Pattern matching
yarn test --grep "webhooks create"
```
