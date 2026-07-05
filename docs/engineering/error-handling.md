# Error Handling

ATTD.vn errors should be safe for users, useful for operators, and consistent across new and migrated APIs.

## User-Facing Errors

- Return clear Vietnamese messages for user-facing API errors.
- Avoid technical implementation details in user-facing messages.
- Provide retry guidance when an operation can be retried.
- Show inline field errors for validation failures where possible.

## Internal Errors

- Log enough context to debug the issue without exposing secrets.
- Do not return stack traces, raw Prisma errors, raw provider responses, or secrets to the client.
- Use stable error codes for API consumers.

## API Shape

New and migrated APIs should use:

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

`details` is optional and must be safe.
