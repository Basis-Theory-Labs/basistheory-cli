Basis Theory CLI
=================

[![Version](https://img.shields.io/npm/v/@basis-theory-labs/cli.svg)](https://www.npmjs.org/package/@basis-theory-labs/cli)
[![Release](https://github.com/Basis-Theory-Labs/basistheory-cli/actions/workflows/release.yml/badge.svg)](https://github.com/Basis-Theory-Labs/basistheory-cli/actions/workflows/release.yml)

Basis Theory CLI tool

Make sure to either have a `BT_MANAGEMENT_KEY` env var exported or pass a `management-key` flag to the commands.

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
@basis-theory-labs/cli/5.0.0 linux-x64 node-v22.23.3
$ bt --help [COMMAND]
USAGE
  $ bt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`bt applications`](#bt-applications)
* [`bt applications create`](#bt-applications-create)
* [`bt applications delete ID`](#bt-applications-delete-id)
* [`bt applications update ID`](#bt-applications-update-id)
* [`bt proxies`](#bt-proxies)
* [`bt proxies create`](#bt-proxies-create)
* [`bt proxies delete ID`](#bt-proxies-delete-id)
* [`bt proxies logs [ID]`](#bt-proxies-logs-id)
* [`bt proxies logs read ID`](#bt-proxies-logs-read-id)
* [`bt proxies logs tail ID`](#bt-proxies-logs-tail-id)
* [`bt proxies update ID`](#bt-proxies-update-id)
* [`bt reactors`](#bt-reactors)
* [`bt reactors create`](#bt-reactors-create)
* [`bt reactors delete ID`](#bt-reactors-delete-id)
* [`bt reactors logs [ID]`](#bt-reactors-logs-id)
* [`bt reactors logs read ID`](#bt-reactors-logs-read-id)
* [`bt reactors logs tail ID`](#bt-reactors-logs-tail-id)
* [`bt reactors update ID`](#bt-reactors-update-id)

## `bt applications`

List Applications. Requires `application:read` Management Application permission

```
USAGE
  $ bt applications -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] Applications list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  List Applications. Requires `application:read` Management Application permission

EXAMPLES
  $ bt applications
```

_See code: [dist/commands/applications/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v5.0.0/dist/commands/applications/index.ts)_

## `bt applications create`

Creates a new Application. Requires `application:create` Management Application permission

```
USAGE
  $ bt applications create -x <value> [-n <value>] [-p <value>] [-t private|public|management] [-z <value>]

FLAGS
  -n, --name=<value>            name of the Application
  -p, --permission=<value>...   permission(s) to use in the Application
  -t, --type=<option>           type of the Application
                                <options: private|public|management>
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  -z, --template=<value>        template ID to create the application with

DESCRIPTION
  Creates a new Application. Requires `application:create` Management Application permission

EXAMPLES
  $ bt applications create
```

## `bt applications delete ID`

Deletes a Application. Requires `application:delete` Management Application permissions

```
USAGE
  $ bt applications delete ID -x <value> [-y]

ARGUMENTS
  ID  Application id to delete

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation

DESCRIPTION
  Deletes a Application. Requires `application:delete` Management Application permissions

EXAMPLES
  $ bt applications delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt applications update ID`

Updates a new Application. Requires `application:update` Management Application permission

```
USAGE
  $ bt applications update ID -x <value> [-n <value>] [-p <value>]

ARGUMENTS
  ID  Application id to update

FLAGS
  -n, --name=<value>            name of the Application
  -p, --permission=<value>...   permission(s) to use in the Application
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Updates a new Application. Requires `application:update` Management Application permission

EXAMPLES
  $ bt applications update
```

## `bt proxies`

List Proxies. Requires `proxy:read` Management Application permission

```
USAGE
  $ bt proxies -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] Proxies list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  List Proxies. Requires `proxy:read` Management Application permission

EXAMPLES
  $ bt proxies
```

_See code: [dist/commands/proxies/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v5.0.0/dist/commands/proxies/index.ts)_

## `bt proxies create`

Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission

```
USAGE
  $ bt proxies create -x <value> [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c <value>] [-a]
    [--request-transform-image node-bt|node22|node24] [--request-transform-package-json <value>]
    [--request-transform-timeout <value>] [--request-transform-warm-concurrency <value>] [--request-transform-resources
    standard|large|xlarge] [--request-transform-permissions <value>] [--response-transform-image node-bt|node22|node24]
    [--response-transform-package-json <value>] [--response-transform-timeout <value>]
    [--response-transform-warm-concurrency <value>] [--response-transform-resources standard|large|xlarge]
    [--response-transform-permissions <value>] [--no-wait]

FLAGS
  -a, --[no-]require-auth                        whether the Proxy requires Basis Theory authentication to be invoked.
                                                 Default: true
  -c, --configuration=<value>                    path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>                   application ID to use in the Proxy
  -n, --name=<value>                             name of the Proxy
  -q, --request-transform-code=<value>           path to JavaScript file containing a Request Transform code
  -s, --response-transform-code=<value>          path to JavaScript file containing a Response Transform code
  -u, --destination-url=<value>                  URL to which requests will be proxied
  -x, --management-key=<value>                   (required) management key used for connecting with the reactor / proxy
  --no-wait                                      do not wait for proxy to be ready (requires at least one transform with
                                                 node22 | node24)
  --request-transform-image=<option>             request-transform runtime image (node-bt|node22|node24)
                                                 <options: node-bt|node22|node24>
  --request-transform-package-json=<value>       path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 | node24 only)
  --request-transform-permissions=<value>...     request-transform permission to grant, repeatable (node22 | node24
                                                 only)
  --request-transform-resources=<option>         request-transform resource tier (node22 | node24 only)
                                                 <options: standard|large|xlarge>
  --request-transform-timeout=<value>            request-transform timeout in seconds, 10-30 (node22 | node24 only)
  --request-transform-warm-concurrency=<value>   request-transform warm concurrency, 0-1 (node22 | node24 only)
  --response-transform-image=<option>            response-transform runtime image (node-bt|node22|node24)
                                                 <options: node-bt|node22|node24>
  --response-transform-package-json=<value>      path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 | node24 only)
  --response-transform-permissions=<value>...    response-transform permission to grant, repeatable (node22 | node24
                                                 only)
  --response-transform-resources=<option>        response-transform resource tier (node22 | node24 only)
                                                 <options: standard|large|xlarge>
  --response-transform-timeout=<value>           response-transform timeout in seconds, 10-30 (node22 | node24 only)
  --response-transform-warm-concurrency=<value>  response-transform warm concurrency, 0-1 (node22 | node24 only)

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
  $ bt proxies delete ID -x <value> [-y]

ARGUMENTS
  ID  Proxy id to delete

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation

DESCRIPTION
  Deletes a Proxy. Requires `proxy:delete` Management Application permissions

EXAMPLES
  $ bt proxies delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt proxies logs [ID]`

Legacy tunnel-based Proxy Transform logs. Opens a local tunnel and updates logging configuration. For v2/runtime debugging, use `bt proxies logs tail <id>` or `bt proxies logs read <id>`. Requires `proxy:update` Management Application permissions

```
USAGE
  $ bt proxies logs [ID] -x <value> [-p <value>]

ARGUMENTS
  ID  Proxy id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Legacy tunnel-based Proxy Transform logs. Opens a local tunnel and updates logging configuration. For v2/runtime
  debugging, use `bt proxies logs tail <id>` or `bt proxies logs read <id>`. Requires `proxy:update` Management
  Application permissions

EXAMPLES
  $ bt proxies logs

  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```

## `bt proxies logs read ID`

Read individual Proxy runtime-log records through the dedicated Events endpoint and exit. Requires `log:read` and runtime logging already enabled.

```
USAGE
  $ bt proxies logs read ID -x <value> [--trace-id <value>] [--transform-type request_transform|response_transform]
    [--level <value>] [--message-search <value>] [--since <value>] [--until <value>] [--format pretty|json|json-pretty]

ARGUMENTS
  ID  Proxy id

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --format=<option>             [default: pretty] pretty: readable logs (trace_id=...); json: compact objects;
                                json-pretty: indented objects. Entries are separated by blank lines; terminal colors
                                include warning/error messages
                                <options: pretty|json|json-pretty>
  --level=<value>               show logs with the specified level (e.g. debug, info, warn, error)
  --message-search=<value>      all query words must match one runtime-log message; combines with other filters using
                                AND
  --since=<value>               window start: positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone;
                                defaults to one hour before the end
  --trace-id=<value>            exact, case-sensitive stored BT trace ID; combines with transform direction using AND
  --transform-type=<option>     exact transform direction; includes both directions when omitted
                                <options: request_transform|response_transform>
  --until=<value>               window end (exclusive): positive duration or ISO timestamp with timezone; defaults to
                                command start

DESCRIPTION
  Read individual Proxy runtime-log records through the dedicated Events endpoint and exit. Requires `log:read` and
  runtime logging already enabled.

  Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters
  combine using AND.

  --message-search searches only the message field and returns matching records, without neighboring records from their
  original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not
  matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and
  raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024
  input characters.

  Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be
  sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations.
  --transform-type filters request or response transforms; omitting it includes both directions. All supplied filters
  combine with message search using AND.

  Defaults to the hour preceding --until, or command start when --until is omitted, with or without filters. Supply
  --since to request a different window. Relative values use one command-start clock. Bounds apply to individual
  occurred_at times, inclusive at start and exclusive at end. Every page is collected before the complete window is
  emitted chronologically, oldest first; initial output is delayed until retrieval completes.

  Each window is bounded to 2,500 returned records, 125 pages, 64 MiB received, and 60 seconds. Work-limit or retrieval
  failures are explicit; an unfinished retrieval window is not emitted. Output failures may leave an emitted prefix.
  Retry with a smaller range rather than assuming truncated results are complete.

  The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a
  snapshot; empty or exhausted results do not prove complete coverage, and complete pre-cutover history is not
  guaranteed. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection
  requires resource opt-in and the platform runtime-log gate. This command does not enable logging or open a tunnel.

EXAMPLES
  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --trace-id customer_Order-42 --transform-type response_transform --message-search "Payment failed" --since 30m

  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --since 30d

  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --transform-type request_transform

  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --transform-type response_transform --since 30m

  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 1h --until 30m

  $ bt proxies logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 2026-10-01T10:00:00Z --until 2026-10-01T10:15:00Z --format json
```

## `bt proxies logs tail ID`

Tail individual Proxy runtime-log records through the dedicated Events endpoint. Requires `log:read` and runtime logging already enabled.

```
USAGE
  $ bt proxies logs tail ID -x <value> [--trace-id <value>] [--transform-type request_transform|response_transform]
    [--level <value>] [--message-search <value>] [--since <value>] [--format pretty|json|json-pretty]

ARGUMENTS
  ID  Proxy id

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --format=<option>             [default: pretty] pretty: readable logs (trace_id=...); json: compact objects;
                                json-pretty: indented objects. Entries are separated by blank lines; terminal colors
                                include warning/error messages
                                <options: pretty|json|json-pretty>
  --level=<value>               show logs with the specified level (e.g. debug, info, warn, error)
  --message-search=<value>      all query words must match one runtime-log message; combines with other filters using
                                AND
  --since=<value>               include initial history from a positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp
                                with timezone; omitted means watch from command start
  --trace-id=<value>            exact, case-sensitive stored BT trace ID; combines with transform direction using AND
  --transform-type=<option>     exact transform direction; includes both directions when omitted
                                <options: request_transform|response_transform>

DESCRIPTION
  Tail individual Proxy runtime-log records through the dedicated Events endpoint. Requires `log:read` and runtime
  logging already enabled.

  Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters
  combine using AND.

  --message-search searches only the message field and returns matching records, without neighboring records from their
  original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not
  matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and
  raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024
  input characters.

  Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be
  sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations.
  --transform-type filters request or response transforms, alone or combined with trace ID using AND; omitting it
  includes both directions. Filters apply to initial history and every live poll.

  Starts at command time and waits five seconds before the first poll. Optional --since performs one immediate bounded
  catch-up, then switches to five-second polling. During normal polling, each window starts one minute before the end of
  the last completed window, never before the requested start, and ends at the new poll time. After a slow poll, this
  includes the elapsed time without leaving an unqueried gap, subject to the same work limits. --until is unsupported;
  use logs read for finite history. Bounds apply to individual occurred_at times, inclusive at start and exclusive at
  end. Every complete window is collected before chronological, oldest-first emission. Late arrivals can appear after
  newer output from earlier polls, so there is no global order across polls or durable resume guarantee.

  Initial history delays first output and must fit the same per-window limits: 2,500 returned records, 125 pages, 64 MiB
  received, and 60 seconds. Retrieval, validation, and work-limit failures exit explicitly without emitting incomplete
  history or starting live polling. Completed earlier output remains on a later failure; output failures can leave an
  emitted prefix. Use logs read for finite or smaller historical ranges instead of expecting silent truncation.

  Busy and idle tails require renewal every 60 minutes, including initial catch-up time. The current bounded window
  finishes first, allowing up to one 60-second cycle of grace. Polling and log output stay paused indefinitely while
  stderr asks "Keep tailing?", default No. Yes starts another 60-minute session and immediately fetches the most recent
  minute, never before the requested start, then resumes normal polling without repeating initial history or clearing
  deduplication state. Earlier logs from the pause may be skipped; use logs read to retrieve them within retention. No
  or Enter stops successfully. Renewal needs interactive stdin and stderr; stdout may be piped. Noninteractive tails
  stop normally with an explanation.

  The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a
  snapshot; complete pre-cutover history is not guaranteed. Application logs come from the injected `logger`, not
  arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Silence may
  mean an idle resource, wrong ID or filter, disabled collection, or delayed indexing. This command does not enable
  logging or open a tunnel. Interruptions, closed output, and errors also stop tailing.

EXAMPLES
  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42

  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --transform-type request_transform

  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --transform-type response_transform --since 30m --format json

  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --since 30m --format json

  $ bt proxies logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --message-search "Payment failed" --transform-type response_transform --since 5m
```

## `bt proxies update ID`

Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission

```
USAGE
  $ bt proxies update ID -x <value> [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c <value>]
    [-a] [--request-transform-image node-bt|node22|node24] [--request-transform-package-json <value>]
    [--request-transform-timeout <value>] [--request-transform-warm-concurrency <value>] [--request-transform-resources
    standard|large|xlarge] [--request-transform-permissions <value>] [--response-transform-image node-bt|node22|node24]
    [--response-transform-package-json <value>] [--response-transform-timeout <value>]
    [--response-transform-warm-concurrency <value>] [--response-transform-resources standard|large|xlarge]
    [--response-transform-permissions <value>] [--no-wait] [-w] [-l]

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
  -x, --management-key=<value>                   (required) management key used for connecting with the reactor / proxy
  --no-wait                                      do not wait for proxy to be ready (requires at least one transform with
                                                 node22 | node24)
  --request-transform-image=<option>             request-transform runtime image (node-bt|node22|node24)
                                                 <options: node-bt|node22|node24>
  --request-transform-package-json=<value>       path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 | node24 only)
  --request-transform-permissions=<value>...     request-transform permission to grant, repeatable (node22 | node24
                                                 only)
  --request-transform-resources=<option>         request-transform resource tier (node22 | node24 only)
                                                 <options: standard|large|xlarge>
  --request-transform-timeout=<value>            request-transform timeout in seconds, 10-30 (node22 | node24 only)
  --request-transform-warm-concurrency=<value>   request-transform warm concurrency, 0-1 (node22 | node24 only)
  --response-transform-image=<option>            response-transform runtime image (node-bt|node22|node24)
                                                 <options: node-bt|node22|node24>
  --response-transform-package-json=<value>      path to runtime package.json JSON file (top-level dependencies
                                                 required; supports resolutions or overrides fallback; pinned versions
                                                 required) (node22 | node24 only)
  --response-transform-permissions=<value>...    response-transform permission to grant, repeatable (node22 | node24
                                                 only)
  --response-transform-resources=<option>        response-transform resource tier (node22 | node24 only)
                                                 <options: standard|large|xlarge>
  --response-transform-timeout=<value>           response-transform timeout in seconds, 10-30 (node22 | node24 only)
  --response-transform-warm-concurrency=<value>  response-transform warm concurrency, 0-1 (node22 | node24 only)

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
  $ bt reactors -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] Reactors list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  List Reactors. Requires `reactor:read` Management Application permission

EXAMPLES
  $ bt reactors
```

_See code: [dist/commands/reactors/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v5.0.0/dist/commands/reactors/index.ts)_

## `bt reactors create`

Creates a new Reactor. Requires `reactor:create` Management Application permission

```
USAGE
  $ bt reactors create -x <value> [-n <value>] [-c <value>] [-i <value>] [-r <value>] [--image node-bt|node22|node24]
    [--package-json <value>] [--timeout <value>] [--warm-concurrency <value>] [--resources standard|large|xlarge]
    [--permissions <value>] [--no-wait] [--async]

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --[no-]async                  execute Reactor invocations asynchronously (node22 | node24 only)
  --image=<option>              runtime image (node-bt|node22|node24)
                                <options: node-bt|node22|node24>
  --no-wait                     do not wait for resource provisioning to complete
  --package-json=<value>        path to runtime package.json JSON file (top-level dependencies required; supports
                                resolutions or overrides fallback; pinned versions required) (node22 | node24 only)
  --permissions=<value>...      permission to grant, repeatable (node22 | node24 only)
  --resources=<option>          resource tier (node22 | node24 only, default: standard)
                                <options: standard|large|xlarge>
  --timeout=<value>             timeout in seconds, 10-900 (node22 | node24 only; maximum 30 when runtime async is
                                disabled; default: 10)
  --warm-concurrency=<value>    number of warm instances, 0-1 (node22 | node24 only, default: 0)

DESCRIPTION
  Creates a new Reactor. Requires `reactor:create` Management Application permission

EXAMPLES
  Create a reactor with legacy runtime

    $ bt reactors create --name "My Reactor" --code ./reactor.js --image node-bt --application-id <application-id>

  Create a reactor with node22 runtime

    $ bt reactors create --name "My Reactor" --code ./reactor.js --image node22

  Create a reactor with node22 and all runtime options

    $ bt reactors create --name "My Reactor" --code ./reactor.js --configuration ./config.env --image node22 --async \
      --timeout 10 --warm-concurrency 0 --resources standard --package-json ./package.json --permissions token:read \
      --permissions token:create
```

## `bt reactors delete ID`

Deletes a Reactor. Requires `reactor:delete` Management Application permissions

```
USAGE
  $ bt reactors delete ID -x <value> [-y]

ARGUMENTS
  ID  Reactor id to delete

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation

DESCRIPTION
  Deletes a Reactor. Requires `reactor:delete` Management Application permissions

EXAMPLES
  $ bt reactors delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt reactors logs [ID]`

Legacy tunnel-based Reactor logs. Opens a local tunnel and updates logging configuration. For v2/runtime debugging, use `bt reactors logs tail <id>` or `bt reactors logs read <id>`. Requires `reactor:update` Management Application permissions

```
USAGE
  $ bt reactors logs [ID] -x <value> [-p <value>]

ARGUMENTS
  ID  Reactor id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Legacy tunnel-based Reactor logs. Opens a local tunnel and updates logging configuration. For v2/runtime debugging,
  use `bt reactors logs tail <id>` or `bt reactors logs read <id>`. Requires `reactor:update` Management Application
  permissions

EXAMPLES
  $ bt reactors logs

  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```

## `bt reactors logs read ID`

Read individual Reactor runtime-log records through the dedicated Events endpoint and exit. Requires `log:read` and runtime logging already enabled.

```
USAGE
  $ bt reactors logs read ID -x <value> [--trace-id <value>] [--level <value>] [--message-search <value>] [--since
    <value>] [--until <value>] [--format pretty|json|json-pretty]

ARGUMENTS
  ID  Reactor id

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --format=<option>             [default: pretty] pretty: readable logs (trace_id=...); json: compact objects;
                                json-pretty: indented objects. Entries are separated by blank lines; terminal colors
                                include warning/error messages
                                <options: pretty|json|json-pretty>
  --level=<value>               show logs with the specified level (e.g. debug, info, warn, error)
  --message-search=<value>      all query words must match one runtime-log message; combines with other filters using
                                AND
  --since=<value>               window start: positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp with timezone;
                                defaults to one hour before the end
  --trace-id=<value>            exact, case-sensitive stored BT trace ID
  --until=<value>               window end (exclusive): positive duration or ISO timestamp with timezone; defaults to
                                command start

DESCRIPTION
  Read individual Reactor runtime-log records through the dedicated Events endpoint and exit. Requires `log:read` and
  runtime logging already enabled.

  Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters
  combine using AND.

  --message-search searches only the message field and returns matching records, without neighboring records from their
  original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not
  matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and
  raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024
  input characters.

  Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively and combines with message
  search using AND. A submitted header may be sanitized by Vault; the CLI does not normalize or trim it. A reused trace
  ID can match multiple invocations.

  Defaults to the hour preceding --until, or command start when --until is omitted, with or without filters. Supply
  --since to request a different window. Relative values use one command-start clock. Bounds apply to individual
  occurred_at times, inclusive at start and exclusive at end. Every page is collected before the complete window is
  emitted chronologically, oldest first; initial output is delayed until retrieval completes.

  Each window is bounded to 2,500 returned records, 125 pages, 64 MiB received, and 60 seconds. Work-limit or retrieval
  failures are explicit; an unfinished retrieval window is not emitted. Output failures may leave an emitted prefix.
  Retry with a smaller range rather than assuming truncated results are complete.

  The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a
  snapshot; empty or exhausted results do not prove complete coverage, and complete pre-cutover history is not
  guaranteed. Application logs come from the injected `logger`, not arbitrary stdout or `console.log`; collection
  requires resource opt-in and the platform runtime-log gate. This command does not enable logging or open a tunnel.

EXAMPLES
  $ bt reactors logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --message-search "Payment failed"

  $ bt reactors logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --message-search "Payment failed" --until 30m

  $ bt reactors logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --since 30d

  $ bt reactors logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 1h --until 30m

  $ bt reactors logs read 03858bf5-32d3-4a2e-b74b-daeea0883bca --since 2026-10-01T10:00:00Z --until 2026-10-01T10:15:00Z --format json
```

## `bt reactors logs tail ID`

Tail individual Reactor runtime-log records through the dedicated Events endpoint. Requires `log:read` and runtime logging already enabled.

```
USAGE
  $ bt reactors logs tail ID -x <value> [--trace-id <value>] [--level <value>] [--message-search <value>] [--since
    <value>] [--format pretty|json|json-pretty]

ARGUMENTS
  ID  Reactor id

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --format=<option>             [default: pretty] pretty: readable logs (trace_id=...); json: compact objects;
                                json-pretty: indented objects. Entries are separated by blank lines; terminal colors
                                include warning/error messages
                                <options: pretty|json|json-pretty>
  --level=<value>               show logs with the specified level (e.g. debug, info, warn, error)
  --message-search=<value>      all query words must match one runtime-log message; combines with other filters using
                                AND
  --since=<value>               include initial history from a positive duration (30s, 5m, 2h, 1d, 1w) or ISO timestamp
                                with timezone; omitted means watch from command start
  --trace-id=<value>            exact, case-sensitive stored BT trace ID

DESCRIPTION
  Tail individual Reactor runtime-log records through the dedicated Events endpoint. Requires `log:read` and runtime
  logging already enabled.

  Optional --level shows logs with the specified level (for example debug, info, warn, or error). All supplied filters
  combine using AND.

  --message-search searches only the message field and returns matching records, without neighboring records from their
  original batch. All analyzed query words must match one message, case-insensitively; word order and adjacency do not
  matter. Shell quotes group one argument, not an exact phrase. Substring, partial-word, wildcard, fuzzy, phrase, and
  raw-query modes are unsupported. The API owns normalization and limits queries to 256 normalized characters and 1,024
  input characters.

  Optional --trace-id matches the effective stored BT trace ID exactly and case-sensitively. A submitted header may be
  sanitized by Vault; the CLI does not normalize or trim it. A reused trace ID can match multiple invocations. Filters
  apply to initial history and every live poll.

  Starts at command time and waits five seconds before the first poll. Optional --since performs one immediate bounded
  catch-up, then switches to five-second polling. During normal polling, each window starts one minute before the end of
  the last completed window, never before the requested start, and ends at the new poll time. After a slow poll, this
  includes the elapsed time without leaving an unqueried gap, subject to the same work limits. --until is unsupported;
  use logs read for finite history. Bounds apply to individual occurred_at times, inclusive at start and exclusive at
  end. Every complete window is collected before chronological, oldest-first emission. Late arrivals can appear after
  newer output from earlier polls, so there is no global order across polls or durable resume guarantee.

  Initial history delays first output and must fit the same per-window limits: 2,500 returned records, 125 pages, 64 MiB
  received, and 60 seconds. Retrieval, validation, and work-limit failures exit explicitly without emitting incomplete
  history or starting live polling. Completed earlier output remains on a later failure; output failures can leave an
  emitted prefix. Use logs read for finite or smaller historical ranges instead of expecting silent truncation.

  Busy and idle tails require renewal every 60 minutes, including initial catch-up time. The current bounded window
  finishes first, allowing up to one 60-second cycle of grace. Polling and log output stay paused indefinitely while
  stderr asks "Keep tailing?", default No. Yes starts another 60-minute session and immediately fetches the most recent
  minute, never before the requested start, then resumes normal polling without repeating initial history or clearing
  deduplication state. Earlier logs from the pause may be skipped; use logs read to retrieve them within retention. No
  or Enter stops successfully. Renewal needs interactive stdin and stderr; stdout may be piped. Noninteractive tails
  stop normally with an explanation.

  The API clamps history to retention and tenant entitlements. Indexing is asynchronous and pagination is not a
  snapshot; complete pre-cutover history is not guaranteed. Application logs come from the injected `logger`, not
  arbitrary stdout or `console.log`; collection requires resource opt-in and the platform runtime-log gate. Silence may
  mean an idle resource, wrong ID or filter, disabled collection, or delayed indexing. This command does not enable
  logging or open a tunnel. Interruptions, closed output, and errors also stop tailing.

EXAMPLES
  $ bt reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42

  $ bt reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --trace-id customer_Order-42 --since 30m --format json

  $ bt reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --level error --since 30m --format json

  $ bt reactors logs tail 03858bf5-32d3-4a2e-b74b-daeea0883bca --message-search "Payment failed" --since 5m
```

## `bt reactors update ID`

Updates an existing Reactor. Requires `reactor:update` Management Application permission

```
USAGE
  $ bt reactors update ID -x <value> [-n <value>] [-c <value>] [-i <value>] [-r <value>] [--image
    node-bt|node22|node24] [--package-json <value>] [--timeout <value>] [--warm-concurrency <value>] [--resources
    standard|large|xlarge] [--permissions <value>] [--no-wait] [--async] [-w] [-l]

ARGUMENTS
  ID  Reactor id to update

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -l, --logs                    Start logs server after update
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -w, --watch                   Watch for changes in supplied code, configuration, and runtime package files
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --[no-]async                  execute Reactor invocations asynchronously (node22 | node24 only)
  --image=<option>              runtime image (node-bt|node22|node24)
                                <options: node-bt|node22|node24>
  --no-wait                     do not wait for resource provisioning to complete
  --package-json=<value>        path to runtime package.json JSON file (top-level dependencies required; supports
                                resolutions or overrides fallback; pinned versions required) (node22 | node24 only)
  --permissions=<value>...      permission to grant, repeatable (node22 | node24 only)
  --resources=<option>          resource tier (node22 | node24 only, default: standard)
                                <options: standard|large|xlarge>
  --timeout=<value>             timeout in seconds, 10-900 (node22 | node24 only; maximum 30 when runtime async is
                                disabled; default: 10)
  --warm-concurrency=<value>    number of warm instances, 0-1 (node22 | node24 only, default: 0)

DESCRIPTION
  Updates an existing Reactor. Requires `reactor:update` Management Application permission

EXAMPLES
  Update a reactor with legacy runtime

    $ bt reactors update <reactor-id> --code ./reactor.js --image node-bt --application-id <application-id>

  Update a reactor with node22 runtime

    $ bt reactors update <reactor-id> --code ./reactor.js --image node22

  Watch a node22 reactor for code, configuration, and dependency changes

    $ bt reactors update <reactor-id> --code ./reactor.js --configuration ./config.env --package-json ./package.json \
      --image node22 --watch

  Update a reactor with node22 and all runtime options

    $ bt reactors update <reactor-id> --name "My Reactor" --code ./reactor.js --configuration ./config.env --image \
      node22 --async --timeout 10 --warm-concurrency 0 --resources standard --package-json ./package.json \
      --permissions token:read --permissions token:create
```
<!-- commandsstop -->
