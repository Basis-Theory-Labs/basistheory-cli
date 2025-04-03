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
@basis-theory-labs/cli/1.12.0 linux-x64 node-v18.20.7
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
* [`bt proxies update ID`](#bt-proxies-update-id)
* [`bt reactorFormulas`](#bt-reactorformulas)
* [`bt reactorFormulas update ID`](#bt-reactorformulas-update-id)
* [`bt reactors`](#bt-reactors)
* [`bt reactors create`](#bt-reactors-create)
* [`bt reactors delete ID`](#bt-reactors-delete-id)
* [`bt reactors logs [ID]`](#bt-reactors-logs-id)
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

_See code: [dist/commands/applications/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.12.0/dist/commands/applications/index.ts)_

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

_See code: [dist/commands/proxies/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.12.0/dist/commands/proxies/index.ts)_

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
    [-a] [-w] [-l]

ARGUMENTS
  ID  Proxy id to update

FLAGS
  -a, --[no-]require-auth                whether the Proxy requires Basis Theory authentication to be invoked. Default:
                                         true
  -c, --configuration=<value>            path to configuration file (.env format) to use in the Proxy
  -i, --application-id=<value>           application ID to use in the Proxy
  -l, --logs                             Start logs server after update
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

## `bt reactorFormulas`

[Deprecated] List Reactor Formulas. Requires `reactor:read` Management Application permission

```
USAGE
  $ bt reactorFormulas -x <value> [-p <value>]

FLAGS
  -p, --page=<value>            [default: 1] Reactors formulas list page to fetch
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  [Deprecated] List Reactor Formulas. Requires `reactor:read` Management Application permission

EXAMPLES
  $ bt reactorFormulas
```

_See code: [dist/commands/reactorFormulas/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.12.0/dist/commands/reactorFormulas/index.ts)_

## `bt reactorFormulas update ID`

[Deprecated] Updates an existing Reactor Formula. Requires `reactor:update` Management Application permission

```
USAGE
  $ bt reactorFormulas update ID -x <value> -n <value> -s <value> -c <value> -p <value> [-d <value>] [-i <value>] [-w]

ARGUMENTS
  ID  Reactor Formula id to update

FLAGS
  -c, --configuration=<value>       (required) path to configuration definition to use in the Reactor Formula
  -d, --description=<value>         description of the Reactor Formula
  -i, --icon=<value>                icon of the Reactor Formula
  -n, --name=<value>                (required) name of the Reactor Formula
  -p, --request-parameters=<value>  (required) path to request params definition to use in the Reactor Formula
  -s, --code=<value>                (required) path to JavaScript file containing code
  -w, --watch                       Watch for changes in informed files
  -x, --management-key=<value>      (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  [Deprecated] Updates an existing Reactor Formula. Requires `reactor:update` Management Application permission

EXAMPLES
  $ bt reactorFormulas update 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactorFormulas update 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./formula.js

  $ bt reactorFormulas update 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./formula.js -w
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

_See code: [dist/commands/reactors/index.ts](https://github.com/Basis-Theory-Labs/basistheory-cli/blob/v1.12.0/dist/commands/reactors/index.ts)_

## `bt reactors create`

Creates a new Reactor. Requires `reactor:create` Management Application permission

```
USAGE
  $ bt reactors create -x <value> [-n <value>] [-c <value>] [-i <value>] [-r <value>]

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Creates a new Reactor. Requires `reactor:create` Management Application permission

EXAMPLES
  $ bt reactors create
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

## `bt reactors update ID`

Updates an existing Reactor. Requires `reactor:update` Management Application permission

```
USAGE
  $ bt reactors update ID -x <value> [-n <value>] [-c <value>] [-i <value>] [-r <value>] [-w] [-l]

ARGUMENTS
  ID  Reactor id to update

FLAGS
  -c, --configuration=<value>   path to configuration file (.env format) to use in the Reactor
  -i, --application-id=<value>  application ID to use in the Reactor
  -l, --logs                    Start logs server after update
  -n, --name=<value>            name of the Reactor
  -r, --code=<value>            path to JavaScript file containing the Reactor code
  -w, --watch                   Watch for changes in informed files
  -x, --management-key=<value>  (required) management key used for connecting with the reactor / proxy

DESCRIPTION
  Updates an existing Reactor. Requires `reactor:update` Management Application permission

EXAMPLES
  $ bt reactors update 03858bf5-32d3-4a2e-b74b-daeea0883bca

  $ bt reactors update 03858bf5-32d3-4a2e-b74b-daeea0883bca --code ./reactor.js

  $ bt reactors update 03858bf5-32d3-4a2e-b74b-daeea0883bca --configuration ./.env.reactor
```
<!-- commandsstop -->
