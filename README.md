Basis Theory CLI
=================

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
@basis-theory-labs/cli/1.0.3 linux-x64 node-v18.16.0
$ bt --help [COMMAND]
USAGE
  $ bt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`bt logs`](#bt-logs)

## `bt logs`

Display live Reactor / Proxy Transform logs output. Requires `reactor:read`, `reactor:update`, `proxy:read` and `proxy:update` Management Application permissions

```
USAGE
  $ bt logs --management-key <value> [-p <value>] [--proxy-id <value>] [--reactor-id <value>]

FLAGS
  -p, --port=<value>        [default: 8220] port to listen for incoming logs
  --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --proxy-id=<value>        proxy id to connect to
  --reactor-id=<value>      reactor id to connect to

DESCRIPTION
  Display live Reactor / Proxy Transform logs output. Requires `reactor:read`, `reactor:update`, `proxy:read` and
  `proxy:update` Management Application permissions

EXAMPLES
  $ bt logs

  $ bt logs -p 3000
```

_See code: [dist/commands/logs.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.0.3/dist/commands/logs.ts)_
<!-- commandsstop -->
