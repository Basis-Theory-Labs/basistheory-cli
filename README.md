Basis Theory CLI
=================

[![Version](https://img.shields.io/npm/v/@basis-theory-labs/cli.svg)](https://www.npmjs.org/package/@basis-theory-labs/cli)
[![Release](https://github.com/Basis-Theory-Labs/basistheory-cli/actions/workflows/release.yml/badge.svg)](https://github.com/Basis-Theory-Labs/basistheory-cli/actions/workflows/release.yml)

Basis Theory CLI tool

## Authentication

API keys can be provided in three ways (in order of precedence):

1. **Flags**: `--api-key` or `--management-key`
2. **Environment variables**: `BT_API_KEY`, `BT_MANAGEMENT_KEY`
3. **Config file**: `~/.basistheory/cli.json`

The config file is automatically created on first run. Example:

```json
{
  "apiKey": "key_...",
  "managementApiKey": "key_...",
  "apiBaseUrl": "https://api.basistheory.com"
}
```

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @basis-theory-labs/cli
$ bt COMMAND
running command...
$ bt (--version)
@basis-theory-labs/cli/4.0.0 darwin-arm64 node-v25.9.0
$ bt --help [COMMAND]
USAGE
  $ bt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`bt 3ds sessions authenticate ID`](#bt-3ds-sessions-authenticate-id)
* [`bt 3ds sessions challenge-result ID`](#bt-3ds-sessions-challenge-result-id)
* [`bt 3ds sessions create`](#bt-3ds-sessions-create)
* [`bt 3ds sessions get ID`](#bt-3ds-sessions-get-id)
* [`bt account-updater jobs`](#bt-account-updater-jobs)
* [`bt account-updater jobs create`](#bt-account-updater-jobs-create)
* [`bt account-updater jobs get ID`](#bt-account-updater-jobs-get-id)
* [`bt account-updater real-time`](#bt-account-updater-real-time)
* [`bt apple-pay create`](#bt-apple-pay-create)
* [`bt apple-pay delete ID`](#bt-apple-pay-delete-id)
* [`bt apple-pay domains`](#bt-apple-pay-domains)
* [`bt apple-pay domains deregister`](#bt-apple-pay-domains-deregister)
* [`bt apple-pay domains register`](#bt-apple-pay-domains-register)
* [`bt apple-pay get ID`](#bt-apple-pay-get-id)
* [`bt apple-pay merchants certificates create MERCHANT-ID`](#bt-apple-pay-merchants-certificates-create-merchant-id)
* [`bt apple-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID`](#bt-apple-pay-merchants-certificates-delete-merchant-id-certificate-id)
* [`bt apple-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID`](#bt-apple-pay-merchants-certificates-get-merchant-id-certificate-id)
* [`bt apple-pay merchants create`](#bt-apple-pay-merchants-create)
* [`bt apple-pay merchants delete ID`](#bt-apple-pay-merchants-delete-id)
* [`bt apple-pay merchants get ID`](#bt-apple-pay-merchants-get-id)
* [`bt apple-pay session`](#bt-apple-pay-session)
* [`bt applications`](#bt-applications)
* [`bt applications create`](#bt-applications-create)
* [`bt applications delete ID`](#bt-applications-delete-id)
* [`bt applications update ID`](#bt-applications-update-id)
* [`bt connections stripe-forward tokenize`](#bt-connections-stripe-forward-tokenize)
* [`bt detokenize`](#bt-detokenize)
* [`bt documents delete ID`](#bt-documents-delete-id)
* [`bt documents download ID`](#bt-documents-download-id)
* [`bt documents get ID`](#bt-documents-get-id)
* [`bt documents upload`](#bt-documents-upload)
* [`bt enrichments bank-account-verify`](#bt-enrichments-bank-account-verify)
* [`bt google-pay create`](#bt-google-pay-create)
* [`bt google-pay delete ID`](#bt-google-pay-delete-id)
* [`bt google-pay get ID`](#bt-google-pay-get-id)
* [`bt google-pay merchants certificates create MERCHANT-ID`](#bt-google-pay-merchants-certificates-create-merchant-id)
* [`bt google-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID`](#bt-google-pay-merchants-certificates-delete-merchant-id-certificate-id)
* [`bt google-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID`](#bt-google-pay-merchants-certificates-get-merchant-id-certificate-id)
* [`bt google-pay merchants create`](#bt-google-pay-merchants-create)
* [`bt google-pay merchants delete ID`](#bt-google-pay-merchants-delete-id)
* [`bt google-pay merchants get ID`](#bt-google-pay-merchants-get-id)
* [`bt keys`](#bt-keys)
* [`bt keys create`](#bt-keys-create)
* [`bt keys delete ID`](#bt-keys-delete-id)
* [`bt logs`](#bt-logs)
* [`bt logs entity-types`](#bt-logs-entity-types)
* [`bt network-tokens create`](#bt-network-tokens-create)
* [`bt network-tokens cryptogram ID`](#bt-network-tokens-cryptogram-id)
* [`bt network-tokens delete ID`](#bt-network-tokens-delete-id)
* [`bt network-tokens get ID`](#bt-network-tokens-get-id)
* [`bt network-tokens resume ID`](#bt-network-tokens-resume-id)
* [`bt network-tokens suspend ID`](#bt-network-tokens-suspend-id)
* [`bt proxies`](#bt-proxies)
* [`bt proxies create`](#bt-proxies-create)
* [`bt proxies delete ID`](#bt-proxies-delete-id)
* [`bt proxies invoke`](#bt-proxies-invoke)
* [`bt proxies logs ID`](#bt-proxies-logs-id)
* [`bt proxies update ID`](#bt-proxies-update-id)
* [`bt reactors`](#bt-reactors)
* [`bt reactors create`](#bt-reactors-create)
* [`bt reactors delete ID`](#bt-reactors-delete-id)
* [`bt reactors get-result ID REQUEST-ID`](#bt-reactors-get-result-id-request-id)
* [`bt reactors invoke ID`](#bt-reactors-invoke-id)
* [`bt reactors invoke-async ID`](#bt-reactors-invoke-async-id)
* [`bt reactors logs ID`](#bt-reactors-logs-id)
* [`bt reactors update ID`](#bt-reactors-update-id)
* [`bt tenants delete`](#bt-tenants-delete)
* [`bt tenants get`](#bt-tenants-get)
* [`bt tenants invitations`](#bt-tenants-invitations)
* [`bt tenants invitations create`](#bt-tenants-invitations-create)
* [`bt tenants invitations delete ID`](#bt-tenants-invitations-delete-id)
* [`bt tenants invitations resend ID`](#bt-tenants-invitations-resend-id)
* [`bt tenants members`](#bt-tenants-members)
* [`bt tenants members delete ID`](#bt-tenants-members-delete-id)
* [`bt tenants members update ID`](#bt-tenants-members-update-id)
* [`bt tenants merchants`](#bt-tenants-merchants)
* [`bt tenants update`](#bt-tenants-update)
* [`bt tenants usage`](#bt-tenants-usage)
* [`bt token-intents create`](#bt-token-intents-create)
* [`bt token-intents delete ID`](#bt-token-intents-delete-id)
* [`bt token-intents get ID`](#bt-token-intents-get-id)
* [`bt tokenize`](#bt-tokenize)
* [`bt tokens`](#bt-tokens)
* [`bt tokens create`](#bt-tokens-create)
* [`bt tokens delete ID`](#bt-tokens-delete-id)
* [`bt tokens get ID`](#bt-tokens-get-id)
* [`bt tokens search`](#bt-tokens-search)
* [`bt tokens types`](#bt-tokens-types)
* [`bt tokens update ID`](#bt-tokens-update-id)
* [`bt webhooks`](#bt-webhooks)
* [`bt webhooks create`](#bt-webhooks-create)
* [`bt webhooks delete ID`](#bt-webhooks-delete-id)
* [`bt webhooks events`](#bt-webhooks-events)
* [`bt webhooks get ID`](#bt-webhooks-get-id)
* [`bt webhooks ping`](#bt-webhooks-ping)
* [`bt webhooks update ID`](#bt-webhooks-update-id)

## `bt 3ds sessions authenticate ID`

Authenticate a 3DS session

```
USAGE
  $ bt 3ds sessions authenticate ID [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

ARGUMENTS
  ID  3DS session id to authenticate

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                authentication request as JSON string
  --file=<value>                path to JSON file containing authentication request
  --json                        output results as JSON

DESCRIPTION
  Authenticate a 3DS session

EXAMPLES
  $ bt 3ds sessions authenticate sess-123 --data '{"authenticationCategory":"payment"}'
```

## `bt 3ds sessions challenge-result ID`

Get a 3DS session challenge result

```
USAGE
  $ bt 3ds sessions challenge-result ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  3DS session id

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a 3DS session challenge result

EXAMPLES
  $ bt 3ds sessions challenge-result sess-123
```

## `bt 3ds sessions create`

Create a 3DS session

```
USAGE
  $ bt 3ds sessions create [-x <value>] [-k <value>] [--json] [--token-id <value>] [--token-intent-id <value>] [--type
    <value>] [--device <value>] [--data <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                session request as JSON string
  --device=<value>              device type
  --file=<value>                path to JSON file containing session request
  --json                        output results as JSON
  --token-id=<value>            token ID to use
  --token-intent-id=<value>     token intent ID to use
  --type=<value>                session type

DESCRIPTION
  Create a 3DS session

EXAMPLES
  $ bt 3ds sessions create
```

## `bt 3ds sessions get ID`

Get a 3DS session by ID

```
USAGE
  $ bt 3ds sessions get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  3DS session id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a 3DS session by ID

EXAMPLES
  $ bt 3ds sessions get sess-123
```

## `bt account-updater jobs`

List account updater jobs

```
USAGE
  $ bt account-updater jobs [-x <value>] [-k <value>] [--json] [--size <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON
  --size=<value>                [default: 20] number of jobs to return

DESCRIPTION
  List account updater jobs

EXAMPLES
  $ bt account-updater jobs
```

## `bt account-updater jobs create`

Create an account updater job

```
USAGE
  $ bt account-updater jobs create [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Create an account updater job

EXAMPLES
  $ bt account-updater jobs create
```

## `bt account-updater jobs get ID`

Get an account updater job by ID

```
USAGE
  $ bt account-updater jobs get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Job id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get an account updater job by ID

EXAMPLES
  $ bt account-updater jobs get job-123
```

## `bt account-updater real-time`

Invoke account updater real-time

```
USAGE
  $ bt account-updater real-time --token-id <value> [-x <value>] [-k <value>] [--json] [--expiration-month <value>]
    [--expiration-year <value>] [--deduplicate-token]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --deduplicate-token           deduplicate token
  --expiration-month=<value>    expiration month
  --expiration-year=<value>     expiration year
  --json                        output results as JSON
  --token-id=<value>            (required) token ID to update

DESCRIPTION
  Invoke account updater real-time

EXAMPLES
  $ bt account-updater real-time --token-id tok-123
```

## `bt apple-pay create`

Create an Apple Pay token

```
USAGE
  $ bt apple-pay create [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>] [--expires-at <value>]
    [--merchant-registration-id <value>]

FLAGS
  -k, --api-key=<value>               private API key used for API authentication
  -x, --management-key=<value>        management key used for API authentication
  --data=<value>                      Apple payment data as JSON string
  --expires-at=<value>                expiration date for the token
  --file=<value>                      path to JSON file containing Apple payment data
  --json                              output results as JSON
  --merchant-registration-id=<value>  merchant registration ID

DESCRIPTION
  Create an Apple Pay token

EXAMPLES
  $ bt apple-pay create
```

## `bt apple-pay delete ID`

Delete an Apple Pay token

```
USAGE
  $ bt apple-pay delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Apple Pay token id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete an Apple Pay token

EXAMPLES
  $ bt apple-pay delete ap-123
```

## `bt apple-pay domains`

List registered Apple Pay domains

```
USAGE
  $ bt apple-pay domains [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  List registered Apple Pay domains

EXAMPLES
  $ bt apple-pay domains
```

## `bt apple-pay domains deregister`

Deregister an Apple Pay domain

```
USAGE
  $ bt apple-pay domains deregister --domain <value> [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --domain=<value>              (required) domain to deregister
  --json                        output results as JSON

DESCRIPTION
  Deregister an Apple Pay domain

EXAMPLES
  $ bt apple-pay domains deregister
```

## `bt apple-pay domains register`

Register an Apple Pay domain

```
USAGE
  $ bt apple-pay domains register --domain <value> [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --domain=<value>              (required) domain to register
  --json                        output results as JSON

DESCRIPTION
  Register an Apple Pay domain

EXAMPLES
  $ bt apple-pay domains register
```

## `bt apple-pay get ID`

Get an Apple Pay token by ID

```
USAGE
  $ bt apple-pay get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Apple Pay token id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get an Apple Pay token by ID

EXAMPLES
  $ bt apple-pay get ap-123
```

## `bt apple-pay merchants certificates create MERCHANT-ID`

Create Apple Pay merchant certificates

```
USAGE
  $ bt apple-pay merchants certificates create MERCHANT-ID --merchant-cert <value> --merchant-cert-password <value> --processor-cert <value>
    --processor-cert-password <value> --domain <value> [-x <value>] [-k <value>] [--json]

ARGUMENTS
  MERCHANT-ID  Apple Pay merchant id

FLAGS
  -k, --api-key=<value>              private API key used for API authentication
  -x, --management-key=<value>       management key used for API authentication
  --domain=<value>                   (required) domain for the certificate
  --json                             output results as JSON
  --merchant-cert=<value>            (required) path to merchant P12 certificate file
  --merchant-cert-password=<value>   (required) password for the merchant certificate
  --processor-cert=<value>           (required) path to processor certificate file
  --processor-cert-password=<value>  (required) password for the processor certificate

DESCRIPTION
  Create Apple Pay merchant certificates

EXAMPLES
  $ bt apple-pay merchants certificates create merch-123
```

## `bt apple-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID`

Delete Apple Pay merchant certificates

```
USAGE
  $ bt apple-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  MERCHANT-ID     Apple Pay merchant id
  CERTIFICATE-ID  certificate id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete Apple Pay merchant certificates

EXAMPLES
  $ bt apple-pay merchants certificates delete merch-123 cert-456
```

## `bt apple-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID`

Get Apple Pay merchant certificates

```
USAGE
  $ bt apple-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  MERCHANT-ID     Apple Pay merchant id
  CERTIFICATE-ID  certificate id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get Apple Pay merchant certificates

EXAMPLES
  $ bt apple-pay merchants certificates get merch-123 cert-456
```

## `bt apple-pay merchants create`

Create an Apple Pay merchant

```
USAGE
  $ bt apple-pay merchants create --merchant-identifier <value> [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>          private API key used for API authentication
  -x, --management-key=<value>   management key used for API authentication
  --json                         output results as JSON
  --merchant-identifier=<value>  (required) merchant identifier

DESCRIPTION
  Create an Apple Pay merchant

EXAMPLES
  $ bt apple-pay merchants create
```

## `bt apple-pay merchants delete ID`

Delete an Apple Pay merchant

```
USAGE
  $ bt apple-pay merchants delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Apple Pay merchant id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete an Apple Pay merchant

EXAMPLES
  $ bt apple-pay merchants delete merch-123
```

## `bt apple-pay merchants get ID`

Get an Apple Pay merchant by ID

```
USAGE
  $ bt apple-pay merchants get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Apple Pay merchant id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get an Apple Pay merchant by ID

EXAMPLES
  $ bt apple-pay merchants get merch-123
```

## `bt apple-pay session`

Create an Apple Pay session

```
USAGE
  $ bt apple-pay session --display-name <value> --domain <value> [-x <value>] [-k <value>] [--json] [--validation-url
    <value>] [--merchant-registration-id <value>]

FLAGS
  -k, --api-key=<value>               private API key used for API authentication
  -x, --management-key=<value>        management key used for API authentication
  --display-name=<value>              (required) display name for the session
  --domain=<value>                    (required) domain for the session
  --json                              output results as JSON
  --merchant-registration-id=<value>  merchant registration ID
  --validation-url=<value>            validation URL for the session

DESCRIPTION
  Create an Apple Pay session

EXAMPLES
  $ bt apple-pay session
```

## `bt applications`

List Applications. Requires `application:read` Management Application permission

```
USAGE
  $ bt applications [-x <value>] [--json] [-p <value>] [-s <value>]

FLAGS
  -p, --page=<value>            [default: 1] Applications list page to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List Applications. Requires `application:read` Management Application permission

EXAMPLES
  $ bt applications
```

_See code: [dist/commands/applications/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/applications/index.ts)_

## `bt applications create`

Creates a new Application. Requires `application:create` Management Application permission

```
USAGE
  $ bt applications create [-x <value>] [--json] [-n <value>] [-p <value>] [-t private|public|management] [-z <value>]

FLAGS
  -n, --name=<value>            name of the Application
  -p, --permission=<value>...   permission(s) to use in the Application
  -t, --type=<option>           type of the Application
                                <options: private|public|management>
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  -z, --template=<value>        template ID to create the application with
  --json                        output results as JSON

DESCRIPTION
  Creates a new Application. Requires `application:create` Management Application permission

EXAMPLES
  $ bt applications create
```

## `bt applications delete ID`

Deletes a Application. Requires `application:delete` Management Application permissions

```
USAGE
  $ bt applications delete ID [-x <value>] [--json] [-y]

ARGUMENTS
  ID  Application id to delete

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation
  --json                        output results as JSON

DESCRIPTION
  Deletes a Application. Requires `application:delete` Management Application permissions

EXAMPLES
  $ bt applications delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt applications update ID`

Updates a new Application. Requires `application:update` Management Application permission

```
USAGE
  $ bt applications update ID [-x <value>] [--json] [-n <value>] [-p <value>]

ARGUMENTS
  ID  Application id to update

FLAGS
  -n, --name=<value>            name of the Application
  -p, --permission=<value>...   permission(s) to use in the Application
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Updates a new Application. Requires `application:update` Management Application permission

EXAMPLES
  $ bt applications update
```

## `bt connections stripe-forward tokenize`

Forward tokenize via Stripe connection

```
USAGE
  $ bt connections stripe-forward tokenize [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                card data as JSON string
  --file=<value>                path to JSON file containing card data
  --json                        output results as JSON

DESCRIPTION
  Forward tokenize via Stripe connection

EXAMPLES
  $ bt connections stripe-forward tokenize --data '{"number":"4242424242424242"}'
```

## `bt detokenize`

Detokenize data

```
USAGE
  $ bt detokenize [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                JSON data to detokenize
  --file=<value>                path to JSON file containing data to detokenize
  --json                        output results as JSON

DESCRIPTION
  Detokenize data

EXAMPLES
  $ bt detokenize --data '{"token_id":"tok-123"}'
```

_See code: [dist/commands/detokenize.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/detokenize.ts)_

## `bt documents delete ID`

Deletes a document

```
USAGE
  $ bt documents delete ID [-x <value>] [-k <value>] [--json] [--force]

ARGUMENTS
  ID  Document ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --force                       skip confirmation prompt
  --json                        output results as JSON

DESCRIPTION
  Deletes a document

EXAMPLES
  $ bt documents delete doc-123

  $ bt documents delete doc-123 --force
```

## `bt documents download ID`

Downloads a document by ID

```
USAGE
  $ bt documents download ID [-x <value>] [-k <value>] [--json] [--output <value>]

ARGUMENTS
  ID  Document ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON
  --output=<value>              output file path

DESCRIPTION
  Downloads a document by ID

EXAMPLES
  $ bt documents download doc-123

  $ bt documents download doc-123 --output ./downloaded.pdf
```

## `bt documents get ID`

Gets a document by ID

```
USAGE
  $ bt documents get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Document ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Gets a document by ID

EXAMPLES
  $ bt documents get doc-123
```

## `bt documents upload`

Uploads a document

```
USAGE
  $ bt documents upload --file <value> [-x <value>] [-k <value>] [--json] [--metadata <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --file=<value>                (required) path to the document file
  --json                        output results as JSON
  --metadata=<value>...         metadata key=value pairs

DESCRIPTION
  Uploads a document

EXAMPLES
  $ bt documents upload --file ./document.pdf

  $ bt documents upload --file ./document.pdf --metadata key1=value1 --metadata key2=value2
```

## `bt enrichments bank-account-verify`

Verify a bank account

```
USAGE
  $ bt enrichments bank-account-verify --token-id <value> [-x <value>] [-k <value>] [--json] [--country-code <value>]
    [--routing-number <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --country-code=<value>        [default: US] country code
  --json                        output results as JSON
  --routing-number=<value>      routing number
  --token-id=<value>            (required) token ID for the bank account

DESCRIPTION
  Verify a bank account

EXAMPLES
  $ bt enrichments bank-account-verify --token-id tok-123
```

## `bt google-pay create`

Create a Google Pay token

```
USAGE
  $ bt google-pay create [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>] [--expires-at <value>]
    [--merchant-registration-id <value>]

FLAGS
  -k, --api-key=<value>               private API key used for API authentication
  -x, --management-key=<value>        management key used for API authentication
  --data=<value>                      Google payment data as JSON string
  --expires-at=<value>                expiration date for the token
  --file=<value>                      path to JSON file containing Google payment data
  --json                              output results as JSON
  --merchant-registration-id=<value>  merchant registration ID

DESCRIPTION
  Create a Google Pay token

EXAMPLES
  $ bt google-pay create
```

## `bt google-pay delete ID`

Delete a Google Pay token

```
USAGE
  $ bt google-pay delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Google Pay token id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete a Google Pay token

EXAMPLES
  $ bt google-pay delete gp-123
```

## `bt google-pay get ID`

Get a Google Pay token by ID

```
USAGE
  $ bt google-pay get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Google Pay token id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a Google Pay token by ID

EXAMPLES
  $ bt google-pay get gp-123
```

## `bt google-pay merchants certificates create MERCHANT-ID`

Create Google Pay merchant certificates

```
USAGE
  $ bt google-pay merchants certificates create MERCHANT-ID --merchant-cert <value> --merchant-cert-password <value> [-x <value>] [-k <value>]
    [--json]

ARGUMENTS
  MERCHANT-ID  Google Pay merchant id

FLAGS
  -k, --api-key=<value>             private API key used for API authentication
  -x, --management-key=<value>      management key used for API authentication
  --json                            output results as JSON
  --merchant-cert=<value>           (required) path to merchant certificate file
  --merchant-cert-password=<value>  (required) password for the merchant certificate

DESCRIPTION
  Create Google Pay merchant certificates

EXAMPLES
  $ bt google-pay merchants certificates create merch-123
```

## `bt google-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID`

Delete Google Pay merchant certificates

```
USAGE
  $ bt google-pay merchants certificates delete MERCHANT-ID CERTIFICATE-ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  MERCHANT-ID     Google Pay merchant id
  CERTIFICATE-ID  certificate id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete Google Pay merchant certificates

EXAMPLES
  $ bt google-pay merchants certificates delete merch-123 cert-456
```

## `bt google-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID`

Get Google Pay merchant certificates

```
USAGE
  $ bt google-pay merchants certificates get MERCHANT-ID CERTIFICATE-ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  MERCHANT-ID     Google Pay merchant id
  CERTIFICATE-ID  certificate id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get Google Pay merchant certificates

EXAMPLES
  $ bt google-pay merchants certificates get merch-123 cert-456
```

## `bt google-pay merchants create`

Create a Google Pay merchant

```
USAGE
  $ bt google-pay merchants create --merchant-identifier <value> [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>          private API key used for API authentication
  -x, --management-key=<value>   management key used for API authentication
  --json                         output results as JSON
  --merchant-identifier=<value>  (required) merchant identifier

DESCRIPTION
  Create a Google Pay merchant

EXAMPLES
  $ bt google-pay merchants create
```

## `bt google-pay merchants delete ID`

Delete a Google Pay merchant

```
USAGE
  $ bt google-pay merchants delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Google Pay merchant id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete a Google Pay merchant

EXAMPLES
  $ bt google-pay merchants delete merch-123
```

## `bt google-pay merchants get ID`

Get a Google Pay merchant by ID

```
USAGE
  $ bt google-pay merchants get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Google Pay merchant id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a Google Pay merchant by ID

EXAMPLES
  $ bt google-pay merchants get merch-123
```

## `bt keys`

List client encryption keys

```
USAGE
  $ bt keys [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List client encryption keys

EXAMPLES
  $ bt keys
```

_See code: [dist/commands/keys/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/keys/index.ts)_

## `bt keys create`

Create a new client encryption key

```
USAGE
  $ bt keys create [-x <value>] [--json] [--expires-at <value>]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --expires-at=<value>          expiration date for the key
  --json                        output results as JSON

DESCRIPTION
  Create a new client encryption key

EXAMPLES
  $ bt keys create
```

## `bt keys delete ID`

Delete a client encryption key

```
USAGE
  $ bt keys delete ID [-x <value>] [--json] [-f]

ARGUMENTS
  ID  Key id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Delete a client encryption key

EXAMPLES
  $ bt keys delete key-123
```

## `bt logs`

List audit logs

```
USAGE
  $ bt logs [-x <value>] [--json] [--entity-type <value>] [--entity-id <value>] [--start-date <value>]
    [--end-date <value>]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --end-date=<value>            filter by end date
  --entity-id=<value>           filter by entity id
  --entity-type=<value>         filter by entity type
  --json                        output results as JSON
  --start-date=<value>          filter by start date

DESCRIPTION
  List audit logs

EXAMPLES
  $ bt logs
```

_See code: [dist/commands/logs/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/logs/index.ts)_

## `bt logs entity-types`

List log entity types

```
USAGE
  $ bt logs entity-types [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List log entity types

EXAMPLES
  $ bt logs entity-types
```

## `bt network-tokens create`

Create a network token

```
USAGE
  $ bt network-tokens create [-x <value>] [-k <value>] [--json] [--token-id <value>] [--token-intent-id <value>] [--data
    <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                card data as JSON string
  --file=<value>                path to JSON file containing card data
  --json                        output results as JSON
  --token-id=<value>            token ID to use
  --token-intent-id=<value>     token intent ID to use

DESCRIPTION
  Create a network token

EXAMPLES
  $ bt network-tokens create --token-id tok-123
```

## `bt network-tokens cryptogram ID`

Get a network token cryptogram

```
USAGE
  $ bt network-tokens cryptogram ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Network token id

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a network token cryptogram

EXAMPLES
  $ bt network-tokens cryptogram nt-123
```

## `bt network-tokens delete ID`

Delete a network token

```
USAGE
  $ bt network-tokens delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Network token id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete a network token

EXAMPLES
  $ bt network-tokens delete nt-123
```

## `bt network-tokens get ID`

Get a network token by ID

```
USAGE
  $ bt network-tokens get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Network token id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a network token by ID

EXAMPLES
  $ bt network-tokens get nt-123
```

## `bt network-tokens resume ID`

Resume a network token

```
USAGE
  $ bt network-tokens resume ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Network token id to resume

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Resume a network token

EXAMPLES
  $ bt network-tokens resume nt-123
```

## `bt network-tokens suspend ID`

Suspend a network token

```
USAGE
  $ bt network-tokens suspend ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Network token id to suspend

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Suspend a network token

EXAMPLES
  $ bt network-tokens suspend nt-123
```

## `bt proxies`

List Proxies. Requires `proxy:read` Management Application permission

```
USAGE
  $ bt proxies [-x <value>] [--json] [-p <value>] [-s <value>]

FLAGS
  -p, --page=<value>            [default: 1] Proxies list page to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List Proxies. Requires `proxy:read` Management Application permission

EXAMPLES
  $ bt proxies
```

_See code: [dist/commands/proxies/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/proxies/index.ts)_

## `bt proxies create`

Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission

```
USAGE
  $ bt proxies create [-x <value>] [--json] [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c
    <value>] [-a] [--request-transform-image node-bt|node22] [--request-transform-package-json <value>]
    [--request-transform-timeout <value>] [--request-transform-warm-concurrency <value>] [--request-transform-resources
    standard|large|xlarge] [--request-transform-permissions <value>] [--response-transform-image node-bt|node22]
    [--response-transform-package-json <value>] [--response-transform-timeout <value>]
    [--response-transform-warm-concurrency <value>] [--response-transform-resources standard|large|xlarge]
    [--response-transform-permissions <value>] [--async]

FLAGS
  -a, --[no-]require-auth                        whether the Proxy requires Basis Theory authentication to be invoked.
                                                 Default: true
  -c, --configuration=<value>                    path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>                   application ID to use in the Proxy
  -n, --name=<value>                             name of the Proxy
  -q, --request-transform-code=<value>           path to JavaScript file containing a Request Transform code
  -s, --response-transform-code=<value>          path to JavaScript file containing a Response Transform code
  -u, --destination-url=<value>                  URL to which requests will be proxied
  -x, --management-key=<value>                   management key used for connecting with the reactor / proxy
  --async                                        do not wait for proxy to be ready (requires at least one transform with
                                                 node22)
  --json                                         output results as JSON
  --request-transform-image=<option>             request-transform runtime image (node-bt|node22)
                                                 <options: node-bt|node22>
  --request-transform-package-json=<value>       path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 only)
  --request-transform-permissions=<value>...     request-transform permission to grant, repeatable (node22 only)
  --request-transform-resources=<option>         request-transform resource tier (node22 only)
                                                 <options: standard|large|xlarge>
  --request-transform-timeout=<value>            request-transform timeout in seconds, 1-30 (node22 only)
  --request-transform-warm-concurrency=<value>   request-transform warm concurrency, 0-1 (node22 only)
  --response-transform-image=<option>            response-transform runtime image (node-bt|node22)
                                                 <options: node-bt|node22>
  --response-transform-package-json=<value>      path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 only)
  --response-transform-permissions=<value>...    response-transform permission to grant, repeatable (node22 only)
  --response-transform-resources=<option>        response-transform resource tier (node22 only)
                                                 <options: standard|large|xlarge>
  --response-transform-timeout=<value>           response-transform timeout in seconds, 1-30 (node22 only)
  --response-transform-warm-concurrency=<value>  response-transform warm concurrency, 0-1 (node22 only)

DESCRIPTION
  Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission

EXAMPLES
  Create a proxy without transforms

    $ bt proxies create --name "My Proxy" --destination-url https://api.example.com

  Create a proxy with legacy runtime transforms

    $ bt proxies create --name "My Proxy" --destination-url https://api.example.com --request-transform-code \
      ./request.js --request-transform-image node-bt --application-id <application-id>

  Create a proxy with node22 transforms

    $ bt proxies create --name "My Proxy" --destination-url https://api.example.com --request-transform-code \
      ./request.js --request-transform-image node22 --response-transform-code ./response.js --response-transform-image \
      node22

  Create a proxy with node22 transforms and all runtime options

    $ bt proxies create --name "My Proxy" --destination-url https://api.example.com --configuration ./config.env \
      --require-auth --request-transform-code ./request.js --request-transform-image node22 \
      --request-transform-timeout 10 --request-transform-warm-concurrency 0 --request-transform-resources standard \
      --request-transform-package-json ./request/package.json --request-transform-permissions token:read \
      --response-transform-code ./response.js --response-transform-image node22 --response-transform-timeout 10 \
      --response-transform-warm-concurrency 0 --response-transform-resources standard \
      --response-transform-package-json ./response/package.json --response-transform-permissions token:read
```

## `bt proxies delete ID`

Deletes a Proxy. Requires `proxy:delete` Management Application permissions

```
USAGE
  $ bt proxies delete ID [-x <value>] [--json] [-y]

ARGUMENTS
  ID  Proxy id to delete

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation
  --json                        output results as JSON

DESCRIPTION
  Deletes a Proxy. Requires `proxy:delete` Management Application permissions

EXAMPLES
  $ bt proxies delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt proxies invoke`

Invokes a Proxy

```
USAGE
  $ bt proxies invoke [-x <value>] [-k <value>] [--json] [--method GET|POST|PUT|PATCH|DELETE] [--proxy-url <value>]
    [--proxy-key <value>] [--data <value>] [--file <value>] [--path <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                request body as JSON string
  --file=<value>                path to a JSON file containing the request body
  --json                        output results as JSON
  --method=<option>             [default: POST] HTTP method to use
                                <options: GET|POST|PUT|PATCH|DELETE>
  --path=<value>                additional path to append to the proxy endpoint
  --proxy-key=<value>           key for pre-configured proxy
  --proxy-url=<value>           destination URL for ephemeral proxy

DESCRIPTION
  Invokes a Proxy

EXAMPLES
  $ bt proxies invoke --proxy-key proxy-key-123 --data '{"key": "value"}'

  $ bt proxies invoke --proxy-url https://example.com/api --method GET
```

## `bt proxies logs ID`

Display live Proxy Transform logs output. Requires `proxy:update` Management Application permissions

```
USAGE
  $ bt proxies logs ID [-x <value>] [--json] [-p <value>]

ARGUMENTS
  ID  Proxy id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Display live Proxy Transform logs output. Requires `proxy:update` Management Application permissions

EXAMPLES
  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```

## `bt proxies update ID`

Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission

```
USAGE
  $ bt proxies update ID [-x <value>] [--json] [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c
    <value>] [-a] [--request-transform-image node-bt|node22] [--request-transform-package-json <value>]
    [--request-transform-timeout <value>] [--request-transform-warm-concurrency <value>] [--request-transform-resources
    standard|large|xlarge] [--request-transform-permissions <value>] [--response-transform-image node-bt|node22]
    [--response-transform-package-json <value>] [--response-transform-timeout <value>]
    [--response-transform-warm-concurrency <value>] [--response-transform-resources standard|large|xlarge]
    [--response-transform-permissions <value>] [--async] [-w] [-l]

ARGUMENTS
  ID  Proxy id to update

FLAGS
  -a, --[no-]require-auth                        whether the Proxy requires Basis Theory authentication to be invoked.
                                                 Default: true
  -c, --configuration=<value>                    path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>                   application ID to use in the Proxy
  -l, --logs                                     Start logs server after update
  -n, --name=<value>                             name of the Proxy
  -q, --request-transform-code=<value>           path to JavaScript file containing a Request Transform code
  -s, --response-transform-code=<value>          path to JavaScript file containing a Response Transform code
  -u, --destination-url=<value>                  URL to which requests will be proxied
  -w, --watch                                    Watch for changes in informed files
  -x, --management-key=<value>                   management key used for connecting with the reactor / proxy
  --async                                        do not wait for proxy to be ready (requires at least one transform with
                                                 node22)
  --json                                         output results as JSON
  --request-transform-image=<option>             request-transform runtime image (node-bt|node22)
                                                 <options: node-bt|node22>
  --request-transform-package-json=<value>       path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 only)
  --request-transform-permissions=<value>...     request-transform permission to grant, repeatable (node22 only)
  --request-transform-resources=<option>         request-transform resource tier (node22 only)
                                                 <options: standard|large|xlarge>
  --request-transform-timeout=<value>            request-transform timeout in seconds, 1-30 (node22 only)
  --request-transform-warm-concurrency=<value>   request-transform warm concurrency, 0-1 (node22 only)
  --response-transform-image=<option>            response-transform runtime image (node-bt|node22)
                                                 <options: node-bt|node22>
  --response-transform-package-json=<value>      path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 only)
  --response-transform-permissions=<value>...    response-transform permission to grant, repeatable (node22 only)
  --response-transform-resources=<option>        response-transform resource tier (node22 only)
                                                 <options: standard|large|xlarge>
  --response-transform-timeout=<value>           response-transform timeout in seconds, 1-30 (node22 only)
  --response-transform-warm-concurrency=<value>  response-transform warm concurrency, 0-1 (node22 only)

DESCRIPTION
  Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission

EXAMPLES
  Update a proxy destination URL

    $ bt proxies update <proxy-id> --destination-url https://api.example.com

  Update a proxy with legacy runtime transforms

    $ bt proxies update <proxy-id> --request-transform-code ./request.js --request-transform-image node-bt \
      --application-id <application-id>

  Update a proxy with node22 transforms

    $ bt proxies update <proxy-id> --request-transform-code ./request.js --request-transform-image node22 \
      --response-transform-code ./response.js --response-transform-image node22

  Update a proxy with node22 transforms and all runtime options

    $ bt proxies update <proxy-id> --name "My Proxy" --destination-url https://api.example.com --configuration \
      ./config.env --require-auth --request-transform-code ./request.js --request-transform-image node22 \
      --request-transform-timeout 10 --request-transform-warm-concurrency 0 --request-transform-resources standard \
      --request-transform-package-json ./request/package.json --request-transform-permissions token:read \
      --response-transform-code ./response.js --response-transform-image node22 --response-transform-timeout 10 \
      --response-transform-warm-concurrency 0 --response-transform-resources standard \
      --response-transform-package-json ./response/package.json --response-transform-permissions token:read
```

## `bt reactors`

List Reactors. Requires `reactor:read` Management Application permission

```
USAGE
  $ bt reactors [-x <value>] [--json] [-p <value>] [-s <value>]

FLAGS
  -p, --page=<value>            [default: 1] Reactors list page to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List Reactors. Requires `reactor:read` Management Application permission

EXAMPLES
  $ bt reactors
```

_See code: [dist/commands/reactors/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/reactors/index.ts)_

## `bt reactors create`

Creates a new Reactor. Requires `reactor:create` Management Application permission

```
USAGE
  $ bt reactors create [-x <value>] [--json] [-n <value>] [-c <value>] [-i <value>] [-r <value>] [--image
    node-bt|node22] [--package-json <value>] [--timeout <value>] [--warm-concurrency <value>] [--resources
    standard|large|xlarge] [--permissions <value>] [--async]

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --async                       do not wait for resource to be ready (node22 only)
  --image=<option>              runtime image (node-bt|node22)
                                <options: node-bt|node22>
  --json                        output results as JSON
  --package-json=<value>        path to runtime package.json JSON file (top-level dependencies required; supports
                                resolutions or overrides fallback; pinned versions required) (node22 only)
  --permissions=<value>...      permission to grant, repeatable (node22 only)
  --resources=<option>          resource tier (node22 only, default: standard)
                                <options: standard|large|xlarge>
  --timeout=<value>             timeout in seconds, 1-30 (node22 only, default: 10)
  --warm-concurrency=<value>    number of warm instances, 0-1 (node22 only, default: 0)

DESCRIPTION
  Creates a new Reactor. Requires `reactor:create` Management Application permission

EXAMPLES
  Create a reactor with legacy runtime

    $ bt reactors create --name "My Reactor" --code ./reactor.js --image node-bt --application-id <application-id>

  Create a reactor with node22 runtime

    $ bt reactors create --name "My Reactor" --code ./reactor.js --image node22

  Create a reactor with node22 and all runtime options

    $ bt reactors create --name "My Reactor" --code ./reactor.js --configuration ./config.env --image node22 \
      --timeout 10 --warm-concurrency 0 --resources standard --package-json ./package.json --permissions token:read \
      --permissions token:create
```

## `bt reactors delete ID`

Deletes a Reactor. Requires `reactor:delete` Management Application permissions

```
USAGE
  $ bt reactors delete ID [-x <value>] [--json] [-y]

ARGUMENTS
  ID  Reactor id to delete

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation
  --json                        output results as JSON

DESCRIPTION
  Deletes a Reactor. Requires `reactor:delete` Management Application permissions

EXAMPLES
  $ bt reactors delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt reactors get-result ID REQUEST-ID`

Gets the result of an asynchronous Reactor invocation

```
USAGE
  $ bt reactors get-result ID REQUEST-ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID          Reactor ID
  REQUEST-ID  Async request ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Gets the result of an asynchronous Reactor invocation

EXAMPLES
  $ bt reactors get-result reactor-123 request-456
```

## `bt reactors invoke ID`

Invokes a Reactor synchronously

```
USAGE
  $ bt reactors invoke ID [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

ARGUMENTS
  ID  Reactor ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                request body as JSON string
  --file=<value>                path to a JSON file containing the request body
  --json                        output results as JSON

DESCRIPTION
  Invokes a Reactor synchronously

EXAMPLES
  $ bt reactors invoke reactor-123 --data '{"key": "value"}'

  $ bt reactors invoke reactor-123 --file ./request.json
```

## `bt reactors invoke-async ID`

Invokes a Reactor asynchronously

```
USAGE
  $ bt reactors invoke-async ID [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

ARGUMENTS
  ID  Reactor ID

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                request body as JSON string
  --file=<value>                path to a JSON file containing the request body
  --json                        output results as JSON

DESCRIPTION
  Invokes a Reactor asynchronously

EXAMPLES
  $ bt reactors invoke-async reactor-123 --data '{"key": "value"}'

  $ bt reactors invoke-async reactor-123 --file ./request.json
```

## `bt reactors logs ID`

Display live Reactor logs output. Requires `reactor:update` Management Application permissions

```
USAGE
  $ bt reactors logs ID [-x <value>] [--json] [-p <value>]

ARGUMENTS
  ID  Reactor id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Display live Reactor logs output. Requires `reactor:update` Management Application permissions

EXAMPLES
  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```

## `bt reactors update ID`

Updates an existing Reactor. Requires `reactor:update` Management Application permission

```
USAGE
  $ bt reactors update ID [-x <value>] [--json] [-n <value>] [-c <value>] [-i <value>] [-r <value>] [--image
    node-bt|node22] [--package-json <value>] [--timeout <value>] [--warm-concurrency <value>] [--resources
    standard|large|xlarge] [--permissions <value>] [--async] [-w] [-l]

ARGUMENTS
  ID  Reactor id to update

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -l, --logs                    Start logs server after update
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -w, --watch                   Watch for changes in informed files
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --async                       do not wait for resource to be ready (node22 only)
  --image=<option>              runtime image (node-bt|node22)
                                <options: node-bt|node22>
  --json                        output results as JSON
  --package-json=<value>        path to runtime package.json JSON file (top-level dependencies required; supports
                                resolutions or overrides fallback; pinned versions required) (node22 only)
  --permissions=<value>...      permission to grant, repeatable (node22 only)
  --resources=<option>          resource tier (node22 only, default: standard)
                                <options: standard|large|xlarge>
  --timeout=<value>             timeout in seconds, 1-30 (node22 only, default: 10)
  --warm-concurrency=<value>    number of warm instances, 0-1 (node22 only, default: 0)

DESCRIPTION
  Updates an existing Reactor. Requires `reactor:update` Management Application permission

EXAMPLES
  Update a reactor with legacy runtime

    $ bt reactors update <reactor-id> --code ./reactor.js --image node-bt --application-id <application-id>

  Update a reactor with node22 runtime

    $ bt reactors update <reactor-id> --code ./reactor.js --image node22

  Update a reactor with node22 and all runtime options

    $ bt reactors update <reactor-id> --name "My Reactor" --code ./reactor.js --configuration ./config.env --image \
      node22 --timeout 10 --warm-concurrency 0 --resources standard --package-json ./package.json --permissions \
      token:read --permissions token:create
```

## `bt tenants delete`

Delete the current tenant

```
USAGE
  $ bt tenants delete [-x <value>] [--json] [-f]

FLAGS
  -f, --force                   force deletion without confirmation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Delete the current tenant

EXAMPLES
  $ bt tenants delete
```

## `bt tenants get`

Get current tenant details

```
USAGE
  $ bt tenants get [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Get current tenant details

EXAMPLES
  $ bt tenants get
```

## `bt tenants invitations`

List tenant invitations

```
USAGE
  $ bt tenants invitations [-x <value>] [--json] [-p <value>] [-s <value>]

FLAGS
  -p, --page=<value>            [default: 1] page number to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List tenant invitations

EXAMPLES
  $ bt tenants invitations
```

## `bt tenants invitations create`

Create a tenant invitation

```
USAGE
  $ bt tenants invitations create -e <value> [-x <value>] [--json] [-r <value>]

FLAGS
  -e, --email=<value>           (required) email address to invite
  -r, --role=<value>            [default: ADMIN] role for the invitation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Create a tenant invitation

EXAMPLES
  $ bt tenants invitations create
```

## `bt tenants invitations delete ID`

Delete a tenant invitation

```
USAGE
  $ bt tenants invitations delete ID [-x <value>] [--json] [-f]

ARGUMENTS
  ID  Invitation id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Delete a tenant invitation

EXAMPLES
  $ bt tenants invitations delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt tenants invitations resend ID`

Resend a tenant invitation

```
USAGE
  $ bt tenants invitations resend ID [-x <value>] [--json]

ARGUMENTS
  ID  Invitation id to resend

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Resend a tenant invitation

EXAMPLES
  $ bt tenants invitations resend 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt tenants members`

List tenant members

```
USAGE
  $ bt tenants members [-x <value>] [--json] [-p <value>] [-s <value>] [--user-id <value>]

FLAGS
  -p, --page=<value>            [default: 1] page number to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON
  --user-id=<value>             filter by user ID

DESCRIPTION
  List tenant members

EXAMPLES
  $ bt tenants members
```

## `bt tenants members delete ID`

Delete a tenant member

```
USAGE
  $ bt tenants members delete ID [-x <value>] [--json] [-f]

ARGUMENTS
  ID  Member id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Delete a tenant member

EXAMPLES
  $ bt tenants members delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt tenants members update ID`

Update a tenant member

```
USAGE
  $ bt tenants members update ID -r <value> [-x <value>] [--json]

ARGUMENTS
  ID  Member id to update

FLAGS
  -r, --role=<value>            (required) role for the member (ADMIN, MEMBER)
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Update a tenant member

EXAMPLES
  $ bt tenants members update
```

## `bt tenants merchants`

List tenant merchants

```
USAGE
  $ bt tenants merchants [-x <value>] [--json] [-p <value>] [-s <value>]

FLAGS
  -p, --page=<value>            [default: 1] page number to fetch
  -s, --size=<value>            [default: 20] number of items per page
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List tenant merchants

EXAMPLES
  $ bt tenants merchants
```

## `bt tenants update`

Update the current tenant

```
USAGE
  $ bt tenants update [-x <value>] [--json] [-n <value>] [--fingerprint-tokens <value>] [--deduplicate-tokens
    <value>] [--disable-ephemeral-proxy <value>]

FLAGS
  -n, --name=<value>                 name of the Tenant
  -x, --management-key=<value>       management key used for connecting with the reactor / proxy
  --deduplicate-tokens=<value>       enable or disable token deduplication
  --disable-ephemeral-proxy=<value>  enable or disable ephemeral proxy
  --fingerprint-tokens=<value>       enable or disable token fingerprinting
  --json                             output results as JSON

DESCRIPTION
  Update the current tenant

EXAMPLES
  $ bt tenants update
```

## `bt tenants usage`

Get tenant usage report

```
USAGE
  $ bt tenants usage [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Get tenant usage report

EXAMPLES
  $ bt tenants usage
```

## `bt token-intents create`

Create a new token intent

```
USAGE
  $ bt token-intents create --type <value> [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                token intent data as JSON string
  --file=<value>                path to JSON file containing token intent data
  --json                        output results as JSON
  --type=<value>                (required) token intent type

DESCRIPTION
  Create a new token intent

EXAMPLES
  $ bt token-intents create --type card --data '{"number":"4242424242424242"}'
```

## `bt token-intents delete ID`

Delete a token intent

```
USAGE
  $ bt token-intents delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Token intent id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete a token intent

EXAMPLES
  $ bt token-intents delete ti-123
```

## `bt token-intents get ID`

Get a token intent by ID

```
USAGE
  $ bt token-intents get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Token intent id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a token intent by ID

EXAMPLES
  $ bt token-intents get ti-123
```

## `bt tokenize`

Tokenize data

```
USAGE
  $ bt tokenize [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --data=<value>                JSON data to tokenize
  --file=<value>                path to JSON file containing data to tokenize
  --json                        output results as JSON

DESCRIPTION
  Tokenize data

EXAMPLES
  $ bt tokenize --data '{"type":"token","data":"secret"}'
```

_See code: [dist/commands/tokenize.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/tokenize.ts)_

## `bt tokens`

List tokens

```
USAGE
  $ bt tokens [-x <value>] [-k <value>] [--json] [--container <value>] [--type <value>] [--fingerprint
    <value>] [--size <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --container=<value>           filter by container
  --fingerprint=<value>         filter by fingerprint
  --json                        output results as JSON
  --size=<value>                [default: 20] number of tokens to return
  --type=<value>                filter by token type

DESCRIPTION
  List tokens

EXAMPLES
  $ bt tokens
```

_See code: [dist/commands/tokens/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/tokens/index.ts)_

## `bt tokens create`

Create a new token

```
USAGE
  $ bt tokens create [-x <value>] [-k <value>] [--json] [--type <value>] [--data <value>] [--file <value>]
    [--token-intent-id <value>] [--container <value>] [--metadata <value>] [--expires-at <value>]
    [--fingerprint-expression <value>] [--deduplicate]

FLAGS
  -k, --api-key=<value>             private API key used for API authentication
  -x, --management-key=<value>      management key used for API authentication
  --container=<value>...            container for the token
  --data=<value>                    token data as JSON string
  --deduplicate                     enable token deduplication
  --expires-at=<value>              token expiration date
  --file=<value>                    path to JSON file containing token data
  --fingerprint-expression=<value>  fingerprint expression
  --json                            output results as JSON
  --metadata=<value>...             metadata key=value pair
  --token-intent-id=<value>         token intent ID to use
  --type=<value>                    token type

DESCRIPTION
  Create a new token

EXAMPLES
  $ bt tokens create --type token --data '{"key":"value"}'
```

## `bt tokens delete ID`

Delete a token

```
USAGE
  $ bt tokens delete ID [-x <value>] [-k <value>] [--json] [-f]

ARGUMENTS
  ID  Token id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Delete a token

EXAMPLES
  $ bt tokens delete tok-123
```

## `bt tokens get ID`

Get a token by ID

```
USAGE
  $ bt tokens get ID [-x <value>] [-k <value>] [--json]

ARGUMENTS
  ID  Token id to retrieve

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  Get a token by ID

EXAMPLES
  $ bt tokens get tok-123
```

## `bt tokens search`

Search tokens

```
USAGE
  $ bt tokens search --query <value> [-x <value>] [-k <value>] [--json] [--size <value>]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON
  --query=<value>               (required) search query
  --size=<value>                [default: 20] number of tokens to return

DESCRIPTION
  Search tokens

EXAMPLES
  $ bt tokens search --query 'data:4242'
```

## `bt tokens types`

List available token types

```
USAGE
  $ bt tokens types [-x <value>] [-k <value>] [--json]

FLAGS
  -k, --api-key=<value>         private API key used for API authentication
  -x, --management-key=<value>  management key used for API authentication
  --json                        output results as JSON

DESCRIPTION
  List available token types

EXAMPLES
  $ bt tokens types
```

## `bt tokens update ID`

Update an existing token

```
USAGE
  $ bt tokens update ID [-x <value>] [-k <value>] [--json] [--data <value>] [--file <value>] [--container <value>]
    [--metadata <value>] [--expires-at <value>] [--fingerprint-expression <value>] [--deduplicate]

ARGUMENTS
  ID  Token id to update

FLAGS
  -k, --api-key=<value>             private API key used for API authentication
  -x, --management-key=<value>      management key used for API authentication
  --container=<value>...            container for the token
  --data=<value>                    token data as JSON string
  --deduplicate                     enable token deduplication
  --expires-at=<value>              token expiration date
  --file=<value>                    path to JSON file containing token data
  --fingerprint-expression=<value>  fingerprint expression
  --json                            output results as JSON
  --metadata=<value>...             metadata key=value pair

DESCRIPTION
  Update an existing token

EXAMPLES
  $ bt tokens update tok-123 --data '{"key":"new-value"}'
```

## `bt webhooks`

List webhooks

```
USAGE
  $ bt webhooks [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List webhooks

EXAMPLES
  $ bt webhooks
```

_See code: [dist/commands/webhooks/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v4.0.0/dist/commands/webhooks/index.ts)_

## `bt webhooks create`

Create a new webhook

```
USAGE
  $ bt webhooks create --name <value> --url <value> --events <value> [-x <value>] [--json] [--notify-email <value>]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --events=<value>...           (required) events to subscribe to
  --json                        output results as JSON
  --name=<value>                (required) name of the webhook
  --notify-email=<value>        email to notify on webhook failure
  --url=<value>                 (required) URL of the webhook

DESCRIPTION
  Create a new webhook

EXAMPLES
  $ bt webhooks create
```

## `bt webhooks delete ID`

Delete a webhook

```
USAGE
  $ bt webhooks delete ID [-x <value>] [--json] [-f]

ARGUMENTS
  ID  Webhook id to delete

FLAGS
  -f, --force                   force deletion without confirmation
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Delete a webhook

EXAMPLES
  $ bt webhooks delete wh-123
```

## `bt webhooks events`

List available webhook event types

```
USAGE
  $ bt webhooks events [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  List available webhook event types

EXAMPLES
  $ bt webhooks events
```

## `bt webhooks get ID`

Get a webhook by ID

```
USAGE
  $ bt webhooks get ID [-x <value>] [--json]

ARGUMENTS
  ID  Webhook id to retrieve

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Get a webhook by ID

EXAMPLES
  $ bt webhooks get wh-123
```

## `bt webhooks ping`

Send a test ping to all webhooks

```
USAGE
  $ bt webhooks ping [-x <value>] [--json]

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --json                        output results as JSON

DESCRIPTION
  Send a test ping to all webhooks

EXAMPLES
  $ bt webhooks ping
```

## `bt webhooks update ID`

Update a webhook

```
USAGE
  $ bt webhooks update ID [-x <value>] [--json] [--name <value>] [--url <value>] [--events <value>] [--notify-email
    <value>]

ARGUMENTS
  ID  Webhook id to update

FLAGS
  -x, --management-key=<value>  management key used for connecting with the reactor / proxy
  --events=<value>...           events to subscribe to
  --json                        output results as JSON
  --name=<value>                name of the webhook
  --notify-email=<value>        email to notify on webhook failure
  --url=<value>                 URL of the webhook

DESCRIPTION
  Update a webhook

EXAMPLES
  $ bt webhooks update wh-123
```
<!-- commandsstop -->
