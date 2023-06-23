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
@basis-theory-labs/cli/1.1.0 linux-x64 node-v18.16.0
$ bt --help [COMMAND]
USAGE
  $ bt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`bt proxies`](#bt-proxies)
* [`bt proxies logs ID`](#bt-proxies-logs-id)
* [`bt reactors`](#bt-reactors)
* [`bt reactors logs ID`](#bt-reactors-logs-id)

## `bt proxies`

list proxies

```
USAGE
  $ bt proxies -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] proxies list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  list proxies

EXAMPLES
  $ bt proxies
```

_See code: [dist/commands/proxies/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.1.0/dist/commands/proxies/index.ts)_

## `bt proxies logs ID`

Display live Proxy Transform logs output. Requires `proxy:read` and `proxy:update` Management Application permissions

```
USAGE
  $ bt proxies logs ID -x <value> [-p <value>]

ARGUMENTS
  ID  Proxy id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Display live Proxy Transform logs output. Requires `proxy:read` and `proxy:update` Management Application permissions

EXAMPLES
  $ bt proxies logs

  $ bt proxies logs -p 3000
```

## `bt reactors`

list reactors

```
USAGE
  $ bt reactors -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] reactors list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  list reactors

EXAMPLES
  $ bt reactors
```

_See code: [dist/commands/reactors/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.1.0/dist/commands/reactors/index.ts)_

## `bt reactors logs ID`

Display live Reactor logs output. Requires `reactor:read` and `reactor:update` Management Application permissions

```
USAGE
  $ bt reactors logs ID -x <value> [-p <value>]

ARGUMENTS
  ID  Reactor id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Display live Reactor logs output. Requires `reactor:read` and `reactor:update` Management Application permissions

EXAMPLES
  $ bt reactors logs

  $ bt reactors logs -p 3000
```
<!-- commandsstop -->
