# EventXTracker — Authorization Matrix & Security Boundaries
**Vidyavardhaka College of Engineering (VVCE), Mysuru**

## 1. Role & Permission Matrix

| Operational Capability | Student | Faculty (Unassigned) | Faculty (Coordinator) | Class Teacher (Assigned) | HOD | President / VP | Volunteer Coord | Authority |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Login to Authority Portal** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Login to Student/Faculty Portal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create Student/Faculty Accounts** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Suspend / Reactivate Accounts** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Assign HODs / Class Teachers** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Create College Events** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Build & Publish Event Forms** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Event Participants (Own Dept)** | ❌ | ✅ (Model A) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **View Event Participants (Cross Dept)** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Appoint Event Leadership** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Shortlist Participants & Teams** | ❌ | ❌ | View Only | View Only | View Only | ✅ | ❌ | ❌ |
| **Approve / Reject Volunteers** | ❌ | ❌ | ✅ | ❌ | ❌ | Recommend | ❌ | ❌ |
| **Allocate Volunteer Duties** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Verify Volunteer Completion** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mark Event Attendance** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Publish Event Winners** | ❌ | View Only | View Only | View Only | View Only | ✅ | ❌ | ❌ |
| **Submit Academic Submissions** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Review Pending Academics** | ❌ | ❌ | ❌ | ✅ (Model B) | ❌ | ❌ | ❌ | ❌ |
| **View Reviewed Academics (Own Dept)**| Self | ✅ | ✅ | ✅ | ✅ | Self | Self | ✅ |
| **View Reviewed Academics (Cross Dept)**| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Generate Institutional PDF Reports** | ❌ | ✅ (Scoped) | ✅ (Scoped) | ✅ (Scoped) | ✅ (Scoped) | ❌ | ❌ | ✅ |

---

## 2. Key Scoping Policies

### 2.1 Model A — Event Operational Scoping
- **Rule 1:** Events are college-wide by default unless specific department/semester eligibility is restricted at creation.
- **Rule 2:** Any faculty member belonging to Department $D$ can inspect student registrations, teams, attendance, and volunteers belonging to Department $D$, without needing a Class Teacher assignment.
- **Rule 3:** Faculty Event Coordinators assigned to Event $E$ have cross-department oversight over all participants in Event $E$.
- **Rule 4:** Department faculty have view-only access unless appointed as coordinator.

### 2.2 Model B — Academic Record Scoping
- **Rule 1:** Academic submissions (Internships, External Technical Events) in state `PENDING_REVIEW` are visible **strictly** to the exact assigned Class Teacher matching `(department_id, semester, section, academic_year)`.
- **Rule 2:** Same-department faculty cannot view pending submissions.
- **Rule 3:** Once an academic submission is reviewed (`VERIFIED`, `REJECTED`, or `ON_HOLD`), it becomes viewable by all faculty belonging to the student's department.
- **Rule 4:** Faculty belonging to other departments are denied access under all states.
- **Rule 5:** Class Teachers cannot verify submissions belonging to other sections or academic years.

