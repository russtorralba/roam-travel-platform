# Dependency security exception: Firebase Firestore gRPC transitives

## Scope and audit result

ROAM's browser application currently resolves this production dependency path:

```text
firebase@13.0.0
└─ @firebase/firestore@4.18.0
   └─ @grpc/grpc-js@1.9.16
```

`npm audit` reports five high-severity affected-package findings (five total),
including development dependencies. `npm audit --omit=dev` reports four
high-severity affected-package findings (four total). These aggregate package
severity counts differ from the individual advisory severities below. The
production audit is therefore not clean.

The gRPC advisories in this chain are:

- [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j):
  `getAuthContext` can treat unauthorized client certificates as authorized in
  certain gRPC server TLS configurations.
- [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4): a
  gRPC server can return a method-handler error message to a client.

## Current applicability and exception

ROAM is currently a browser-only React/Vite application. It imports Firebase
through browser entry points and has no application server, SSR runtime, Node
Firestore initialization, gRPC server, gRPC method handler, or
`getAuthContext` use. The installed Firestore package uses separate browser and
Node export targets; the gRPC implementation is part of the Node path. The
server-side prerequisites described by these advisories are not present in the
current deployed architecture.

This is an architecture-dependent non-reachability assessment, not proof that
the vulnerable package could never be reached. `npm audit` remains non-clean;
the exception is limited to the current browser-only deployment.

## Required reassessment and remediation constraints

Reassess this exception before introducing any Node.js, SSR, server-side
Firebase, server-side Firestore, or gRPC use. Also reassess when Firebase
releases a compatible dependency update that includes a patched
`@grpc/grpc-js` version.

Do not automatically apply an npm override for `@grpc/grpc-js`, because it
would exceed Firestore's declared compatibility range. Do not automatically
downgrade Firebase across major versions based on audit remediation output.
Either action requires a supported upstream dependency path and targeted
regression testing.

## Release verification checklist

- [ ] Record this exception with the release decision and continue monitoring
  Firebase dependency releases.
- [ ] Re-run production and development dependency audits before release.
- [ ] Confirm no Node/SSR/server-side Firebase or Firestore runtime was added.
- [ ] Independently verify the exact published Firestore rules version. Console
  screenshots and local file comparisons are supporting evidence only; they do
  not independently establish the active deployed ruleset.
- [ ] Independently verify Production environment-variable values. Existing
  screenshots or local configuration evidence are supporting evidence only.
