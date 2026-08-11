# Architecture

_Last updated: 2023._

The service reads invoices from the queue and writes them to the reporting
database. Both were removed in the 2024 rewrite; the current entry point is
`src/index.js`, which this document predates.
