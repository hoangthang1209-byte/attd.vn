# API Conventions

This is the future standard for new APIs and gradual migration. Do not refactor all existing APIs only to match this document unless a sprint explicitly scopes that migration.

## Success Response

```json
{
  "ok": true,
  "data": {}
}
```

`data` contains the successful payload. Use an object or array that matches the route contract.

## Error Response

```json
{
  "ok": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Vietnamese user-facing message",
    "details": {}
  }
}
```

`details` is optional and should only include safe diagnostic context.

## Rules

- Use stable string error codes.
- Error messages returned to users should be Vietnamese and safe to display.
- Do not expose stack traces, raw database errors, raw secrets, or internal tokens.
- Validate input before mutating data.
- Check permissions server-side before mutations.
- Prefer shared response helpers once available in `src/lib/api`.
- Preserve existing route contracts unless a sprint explicitly migrates them.
