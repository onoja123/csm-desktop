# Security Policy

## Supported versions

CSM Desktop is pre-1.0. Security fixes land on the `main` branch and in the latest release only.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately instead:

- on GitHub, through **Security → Report a vulnerability** on this repository, or
- by email to [okpeonoja18@gmail.com](mailto:okpeonoja18@gmail.com).

Include what you found, how to reproduce it and the impact you expect. I aim to acknowledge reports within a week and to share a fix or a plan once the problem is confirmed. Please allow time for a fix to ship before disclosing the issue publicly.

## Scope

CSM Desktop is a client for the local [csm](https://github.com/onoja123/csm) service:

- It talks only to that service, over a unix socket on the same machine (`~/.csm/csm.sock`). It makes no other network requests and collects no telemetry.
- It never receives tokens, API keys or MCP secret values; csm redacts them before anything reaches the app.
- Its embedded terminal runs shells with your own user's permissions.

Vulnerabilities in the csm service or command-line tool belong in the [csm repository](https://github.com/onoja123/csm/security).
