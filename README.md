Basis Theory CLI
=================

Basis Theory CLI tool

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @basis-theory/cli
$ bt COMMAND
running command...
$ bt (--version)
@basis-theory/cli/0.0.0 darwin-arm64 node-v18.15.0
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

Display live Reactor / Proxy Transform logs output

```
USAGE
  $ bt logs --management-key <value> [-p <value>] [--proxy-id <value>] [--reactor-id <value>]

FLAGS
  -p, --port=<value>        [default: 8220] port to listen for incoming logs
  --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  --proxy-id=<value>        proxy id to connect to
  --reactor-id=<value>      reactor id to connect to

DESCRIPTION
  Display live Reactor / Proxy Transform logs output

EXAMPLES
  $ bt logs

  $ bt logs -p 3000
```

_See code: [dist/commands/logs.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v0.0.0/dist/commands/logs.ts)_
<!-- commandsstop -->
