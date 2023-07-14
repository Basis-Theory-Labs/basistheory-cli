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
@basis-theory-labs/cli/1.5.2 linux-x64 node-v18.16.1
$ bt --help [COMMAND]
USAGE
  $ bt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`bt proxies`](#bt-proxies)
* [`bt proxies create`](#bt-proxies-create)
* [`bt proxies delete ID`](#bt-proxies-delete-id)
* [`bt proxies logs [ID]`](#bt-proxies-logs-id)
* [`bt proxies update ID`](#bt-proxies-update-id)
* [`bt reactors`](#bt-reactors)
* [`bt reactors logs [ID]`](#bt-reactors-logs-id)

## `bt proxies`

List Proxies. Requires `proxy:read` Management Application permission

```
USAGE
  $ bt proxies -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] proxies list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  List Proxies. Requires `proxy:read` Management Application permission

EXAMPLES
  $ bt proxies
```

_See code: [dist/commands/proxies/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.5.2/dist/commands/proxies/index.ts)_

## `bt proxies create`

Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission

```
USAGE
  $ bt proxies create -x <value> [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c <value>] [-a]

FLAGS
  -a, --[no-]require-auth                whether the Proxy requires Basis Theory authentication to be invoked. Default:
                                         true
  -c, --configuration=<value>            path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>           application ID to use in the Proxy
  -n, --name=<value>                     name of the Proxy
  -q, --request-transform-code=<value>   path to JavaScript file containing a Request Transform code
  -s, --response-transform-code=<value>  path to JavaScript file containing a Response Transform code
  -u, --destination-url=<value>          URL to which requests will be proxied
  -x, --management-key=<value>           (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Creates a new Pre-Configured Proxy. Requires `proxy:create` Management Application permission

EXAMPLES
  $ bt proxies create
```

## `bt proxies delete ID`

Deletes a Proxy. Requires `proxy:delete` and `proxy:read` Management Application permissions

```
USAGE
  $ bt proxies delete ID -x <value> [-y]

ARGUMENTS
  ID  Proxy id to delete

FLAGS
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy
  -y, --yes                     auto confirm the operation

DESCRIPTION
  Deletes a Proxy. Requires `proxy:delete` and `proxy:read` Management Application permissions

EXAMPLES
  $ bt proxies delete 03858bf5-32d3-4a2e-b74b-daeea0883bca
```

## `bt proxies logs [ID]`

Display live Proxy Transform logs output. Requires `proxy:update` Management Application permissions

```
USAGE
  $ bt proxies logs [ID] -x <value> [-p <value>]

ARGUMENTS
  ID  Proxy id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Display live Proxy Transform logs output. Requires `proxy:update` Management Application permissions

EXAMPLES
  $ bt proxies logs

  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt proxies logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```

## `bt proxies update ID`

Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission

```
USAGE
  $ bt proxies update ID -x <value> [-n <value>] [-u <value>] [-q <value>] [-s <value>] [-i <value>] [-c <value>]
    [-a] [-w]

ARGUMENTS
  ID  Proxy id to update

FLAGS
  -a, --[no-]require-auth                whether the Proxy requires Basis Theory authentication to be invoked. Default:
                                         true
  -c, --configuration=<value>            path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>           application ID to use in the Proxy
  -n, --name=<value>                     name of the Proxy
  -q, --request-transform-code=<value>   path to JavaScript file containing a Request Transform code
  -s, --response-transform-code=<value>  path to JavaScript file containing a Response Transform code
  -u, --destination-url=<value>          URL to which requests will be proxied
  -w, --watch                            Watch for changes in informed files
  -x, --management-key=<value>           (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Updates an existing Pre-Configured Proxy. Requires `proxy:update` Management Application permission

EXAMPLES
  $ bt proxies update 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt proxies update 03858bf5-32d3-4a2e-b74b-daeea0883bca --destination-url https://echo.basistheory.com

  $ bt proxies update 03858bf5-32d3-4a2e-b74b-daeea0883bca --request-transform-code ./myRequestTransform.js

  $ bt proxies update 03858bf5-32d3-4a2e-b74b-daeea0883bca --configuration ./.env.proxy
```

## `bt reactors`

List Reactors. Requires `reactor:read` Management Application permission

```
USAGE
  $ bt reactors -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] reactors list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  List Reactors. Requires `reactor:read` Management Application permission

EXAMPLES
  $ bt reactors
```

_See code: [dist/commands/reactors/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.5.2/dist/commands/reactors/index.ts)_

## `bt reactors logs [ID]`

Display live Reactor logs output. Requires `reactor:update` Management Application permissions

```
USAGE
  $ bt reactors logs [ID] -x <value> [-p <value>]

ARGUMENTS
  ID  Reactor id to connect to

FLAGS
  -p, --port=<value>            [default: 8220] port to listen for incoming logs
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Display live Reactor logs output. Requires `reactor:update` Management Application permissions

EXAMPLES
  $ bt reactors logs

  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactors logs 03858bf5-32d3-4a2e-b74b-daeea0883bca -p 3000
```
<!-- commandsstop -->
