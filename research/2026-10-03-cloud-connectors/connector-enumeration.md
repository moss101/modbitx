# Cloud surfaces in both reference apps — enumeration for Modbitx connectors

Date: 2026-10-03. Source: string-mining the two bundles on disk (ChatGPT webview assets at
`/tmp/chatgpt-extract` from `ChatGPT.app` 26.930.21537; Claude i18n at
`Claude.app/Contents/Resources/ion-dist/i18n/en-US.json`). Hit counts are occurrence counts in
each bundle's UI strings.

## Tier 1 — implementable now (token-based REST, user's own credentials)

| Connector | ChatGPT hits | Claude hits | Auth | What Modbitx tools would do |
|---|---|---|---|---|
| Slack | (Claude 127) | 127 | Bot token `xoxb-…` from a user-created Slack app | post a message, read recent channel history |
| Linear | (Claude 18) | 18 | Personal API key (GraphQL) | search issues, update status, comment |
| Jira | (both) | 8 | Site + email + API token (REST v3, Basic) | search with JQL, comment |
| Notion | 707 | 11 | Integration token (REST) | search pages, append to a page |
| Figma | 729 | 12 | Personal access token (REST) | read file/comment metadata |
| Sentry | 30 | — | Auth token (REST) | list recent issues for a project |
| Stripe | 335 | 7 | Secret key (REST) | read charges/balance (read-only) |

## Tier 2 — OAuth-dependent, deferred until a hosted OAuth app exists

Google Drive (1394), Gmail (835), Canva (1428), SharePoint (260), Outlook (206), Salesforce (323),
HubSpot (63), Dropbox (88), Box (195). These need a registered OAuth application per vendor; the
user could host their own, but that is a setup project, not a connector.

## Genuinely vendor-only (stays deferred)
Devin Cloud sessions/VM fleet, Claude cloud Cowork and hosted review agents, Sora/Operator/GPTs,
ChatGPT's telemetry/opt-out plumbing.

## Design for Modbitx
A generic `http:json` bridge in the main process (method + headers + JSON body in, status + text
out) so each connector is a thin tool over its REST API with credentials the user pastes in
Settings → Connectors. Connector toggles gate their tools exactly like the Messages bridge.
