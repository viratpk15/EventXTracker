# EventXTracker — Dynamic Form Builder & Immutable Versioning
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Principles
Event registration forms are dynamic and require zero code modifications:
- **Immutable Versioning:** Each time a form is published, a new `FormVersion` record is created. Previous submissions remain permanently linked to the specific version under which they were registered.
- **Strict Server-Side Validation:** The backend validates answers against question rules:
  - Required field presence
  - Email format
  - Min/max numeric limits
  - Text character bounds
  - Choice membership against configured options

---

## 2. Supported Question Types
- `short_text`: Single-line text input
- `long_text` / `paragraph`: Multi-line text area
- `email`: Validated email address
- `phone`: Contact telephone number
- `number`: Numeric value with optional `min` and `max` constraints
- `dropdown` / `select`: Single-choice select menu
- `radio` / `mcq`: Single-choice radio options
- `checkbox`: Multi-select choices
- `rating`: Star or numerical rating scale
- `section_heading` / `instructions`: Display-only guidance headers

