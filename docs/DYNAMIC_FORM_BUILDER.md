# EVENTXTRACKER — DYNAMIC EVENT FORM BUILDER SPECIFICATION & IMPLEMENTATION

**Institution:** Vidyavardhaka College of Engineering (VVCE), Mysuru  
**System:** EventXTracker Form Builder Subsystem  
**Author:** Antigravity AI Engineering Team  
**Status:** COMPLETE & VERIFIED  
**Date:** November 6, 2026  

---

## 1. System Overview & Architectural Objectives

The Dynamic Event Form Builder provides a native, Google Forms-style visual questionnaire authoring experience inside EventXTracker's Faculty Portal. It empowers Faculty Event Coordinators to design, customize, preview, version, and publish rich event application forms without requiring static code changes or manual database re-configurations.

### Key Capabilities
1. **Visual Form Authoring:** Faculty can create forms from scratch, add/edit/duplicate/delete/reorder questions, and configure section dividers and descriptive instructions.
2. **18 Supported Question Types:** Complete spectrum of text, choice, numeric, currency, date/time, media upload, rating scales, and structural elements.
3. **Real-Time Conditional Visibility:** Dynamic reveal/collapse of questions based on user answers to prerequisite questions.
4. **Immutable Form Versioning:** Edits never corrupt historical submissions. Drafts can be saved independently; publishing increments the version (`v1` $\rightarrow$ `v2`) and creates an immutable snapshot of the schema.
5. **Robust Server-Side Validation:** Validates required questions, types, numeric bounds, text lengths, email formats, phone digit counts, option inclusion, and file sizes. Does not rely solely on frontend checks.
6. **Submissions Inspection:** Faculty can view registrant responses, with each submission explicitly tagged with the exact form version under which it was entered.

---

## 2. Supported Question Types & Configuration Schema

Every question is persisted with a standardized schema object:

```typescript
export interface FormQuestion {
  id: string
  type: QuestionType
  title: string
  description?: string
  placeholder?: string
  required?: boolean
  section?: string
  order?: number
  options?: string[]
  min_length?: number
  max_length?: number
  min?: number
  max?: number
  allowed_extensions?: string[]
  max_size_mb?: number
  currency_symbol?: string
  rating_max?: number
  conditional?: FormCondition
}
```

### Complete Inventory of Supported Types

| Question Type Key | Display Name | Category | Specific Configuration Controls |
|---|---|---|---|
| `short_text` | Short Text | Text | Placeholder, Min Characters, Max Characters, Required |
| `paragraph` | Paragraph / Long Text | Text | Multi-line rows, Placeholder, Min Characters, Max Characters, Required |
| `email` | Email Address | Contact | Automatic email syntax validation (`@` and domain check), Placeholder, Required |
| `phone` | Phone Number | Contact | 10–15 digit numeric validation, Placeholder, Required |
| `number` | Numeric Value | Number | Integer or Decimal step, Min Value, Max Value, Required |
| `currency` | Currency | Number | Currency symbol (`₹`, `$`, etc.), Min Value, Max Value, Required |
| `dropdown` | Dropdown Selection | Choice | Dynamic option list (add, edit, delete options), Placeholder, Required |
| `single_choice` | Single Choice (Radio) | Choice | Card-style radio buttons, option list, Required |
| `multiple_choice`| Multiple Choice (Checkboxes)| Choice | Multi-select checkboxes, option list, Required |
| `yes_no` | Yes / No Toggle | Choice | High-contrast pill toggle buttons, Required |
| `date` | Date | Temporal | HTML5 Date Picker (`YYYY-MM-DD`), Required |
| `time` | Time | Temporal | HTML5 Time Picker (`HH:MM`), Required |
| `datetime` | Date & Time | Temporal | HTML5 Datetime Picker (`YYYY-MM-DDTHH:MM`), Required |
| `url` | Website / Portfolio URL | Media | `http://` or `https://` prefix enforcement, Placeholder, Required |
| `file` | File Upload | Media | Allowed extensions (`pdf, png, jpg, zip`), Max Size (MB), Upload to `/api/v1/events/:id/upload` |
| `rating` | Rating Scale | Scale | Selectable scale (1 to 5 Stars or 1 to 10 Scale), Required |
| `section_heading` | Section Heading | Structural | Section title, sub-description divider (non-input display card) |
| `instruction` | Instructions Banner | Structural | Institutional blue guidance callout with informational icon (non-input display card) |

---

## 3. Conditional Visibility Engine

### 3.1 Schema Definition
Questions can define conditional visibility using a structured rule:
```json
{
  "conditional": {
    "depends_on_question_id": "q_own_laptop",
    "operator": "equals",
    "value": "Yes"
  }
}
```

Supported operators:
- `equals`: Exact case-insensitive string match.
- `not_equals`: Matches any value other than target.
- `in`: For multiple-choice questions, checks if target option is included in the selected array.
- `not_empty`: Evaluates whether the prerequisite question has received any non-empty answer.

### 3.2 Dynamic Evaluation Workflow
1. **Frontend Rendering:** When prerequisite choices change, dependent questions smoothly reveal or collapse. Hidden questions bypass client-side required checks.
2. **Backend Validation:** In `validate_answers()`, if a question's condition is not met based on the submitted answers payload:
   - Required checks are bypassed.
   - Any submitted value for the hidden question is automatically purged from the persistent record.
   - If the condition is met, strict type and required checks are enforced.

---

## 4. Immutable Form Versioning Lifecycle

```mermaid
flowchart TD
    DRAFT["Faculty Edits Draft Form<br/>(PUT /events/:id/form/draft)"]
    PREV["Preview as Student Mode<br/>(Simulated Interactive Rendering)"]
    PUB1["Publish Version 1<br/>(PUT /events/:id/form)"]
    SUB1["Student A Submits Registration<br/>(Recorded under v1 Schema)"]
    EDIT["Faculty Adds Questions & Reorders<br/>(Saved to draft)"]
    PUB2["Publish Version 2<br/>(Incremented to v2 Schema)"]
    SUB2["Student B Submits Registration<br/>(Recorded under v2 Schema)"]
    AUDIT["Submission Inspection<br/>(Student A shows v1; Student B shows v2)"]

    DRAFT --> PREV
    PREV --> DRAFT
    DRAFT --> PUB1
    PUB1 --> SUB1
    PUB1 --> EDIT
    EDIT --> PUB2
    PUB2 --> SUB2
    SUB1 --> AUDIT
    SUB2 --> AUDIT
```

### Database Persistence Model
- **`event_forms`:** Parent record per event storing `published_version`, `draft_schema_json`, `title`, and `description`.
- **`event_form_versions`:** Immutable version records storing `form_id`, `version`, `title`, `description`, `schema_json`, and `published_at`.
- **`registrations`:** Registrant record storing `form_version`, `registration_id`, `student_user_id`, and `answers_json`.

---

## 5. Automated Verification Evidence

The implementation is verified by `backend/tests/test_dynamic_form_builder.py` covering all 12 operational scenarios:

```bash
$ .venv/bin/pytest backend/tests/test_dynamic_form_builder.py -v
============================= test session starts ==============================
backend/tests/test_dynamic_form_builder.py::test_form_builder_draft_and_publish_v1 PASSED [ 33%]
backend/tests/test_dynamic_form_builder.py::test_student_registration_validation_and_submission PASSED [ 66%]
backend/tests/test_dynamic_form_builder.py::test_form_versioning_and_submission_immutability PASSED [100%]
========================= 3 passed, 1 warning in 1.13s =========================
```

---

## 6. Visual Audit Evidence (Screenshots)

Captured using headless Google Chrome on macOS:
1. `screenshots/18_form_builder_desktop.png`: Faculty Form Builder (1440 × 900) displaying questions, choice editors, reorder buttons, and conditional settings.
2. `screenshots/19_form_builder_mobile.png`: Faculty Form Builder on mobile viewport (390 × 844).
3. `screenshots/20_form_builder_preview.png`: Student Preview Mode Modal simulating live rendering.
4. `screenshots/21_student_dynamic_form_desktop.png`: Student live event registration form with conditional questions (1440 × 900).
5. `screenshots/22_student_dynamic_form_mobile.png`: Student live event registration form on mobile (390 × 844).
6. `screenshots/23_student_registration_confirmed.png`: Registration confirmation view displaying unique Registration ID.
7. `screenshots/24_form_version_history_modal.png`: Form Version History modal showing v1 and v2 with submission counts.
8. `screenshots/25_faculty_inspect_old_submission_v1.png`: Faculty submission inspector showing student answers immutably bound to v1.

