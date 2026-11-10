"""SQLAlchemy ORM models for EventXTracker."""
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship

from .db import Base


def utcnow():
    return datetime.now(timezone.utc)


class AccountType(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    AUTHORITY = "AUTHORITY"


class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"
    PENDING_ACTIVATION = "PENDING_ACTIVATION"


BRANCHES = ["CSE", "ISE", "AIML", "EC", "EEE", "ME", "CV"]


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    code = Column(String(6), unique=True, nullable=False)  # CSE, ISE, ...
    name = Column(String(120), nullable=False)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(160), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    status = Column(Enum(AccountStatus), default=AccountStatus.PENDING_ACTIVATION, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    temp_password = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    quote = Column(String(500), nullable=True)
    is_seeded = Column(Boolean, default=False, nullable=False)
    seed_batch = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    faculty_profile = relationship("FacultyProfile", back_populates="user", uselist=False)


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(160), nullable=False)
    usn = Column(String(20), unique=True, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    joining_year = Column(Integer, nullable=False)
    current_semester = Column(Integer, nullable=False)
    section = Column(String(4), nullable=False)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    quote = Column(String(500), nullable=True)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department")


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(160), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    designation = Column(String(80), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    quote = Column(String(500), nullable=True)

    user = relationship("User", back_populates="faculty_profile")
    department = relationship("Department")


class AcademicSetting(Base):
    __tablename__ = "academic_settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(80), unique=True, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class HODAssignment(Base):
    __tablename__ = "hod_assignments"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    faculty_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utcnow)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True, nullable=False)


class ClassTeacherAssignment(Base):
    __tablename__ = "class_teacher_assignments"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String(4), nullable=False)
    academic_year = Column(String(9), nullable=False)  # e.g. 2025-26
    faculty_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utcnow)
    active = Column(Boolean, default=True, nullable=False)


class ActivationToken(Base):
    __tablename__ = "activation_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)


# ----------------------------- Events ---------------------------------

class EventStatus(str, enum.Enum):
    UPCOMING = "UPCOMING"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    CLOSED = "CLOSED"
    ENDED = "ENDED"


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(80), nullable=True)
    event_type = Column(String(80), nullable=True)
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(64), default="Asia/Kolkata", nullable=False)
    venue = Column(String(200), nullable=True)
    reg_open_at = Column(DateTime(timezone=True), nullable=True)
    reg_close_at = Column(DateTime(timezone=True), nullable=True)
    individual_enabled = Column(Boolean, default=True, nullable=False)
    team_enabled = Column(Boolean, default=False, nullable=False)
    volunteer_enabled = Column(Boolean, default=False, nullable=False)
    min_team_size = Column(Integer, default=2)
    max_team_size = Column(Integer, default=4)
    eligible_departments = Column(String(200), nullable=True)  # CSV of branch codes; NULL = all
    eligible_semesters = Column(String(100), nullable=True)    # CSV of ints; NULL = all
    require_same_department = Column(Boolean, default=False, nullable=False)
    registration_fee = Column(Float, default=0.0, nullable=False)
    upi_id = Column(String(100), nullable=True)
    whatsapp_group_url = Column(String(500), nullable=True)
    payment_qr_url = Column(String(500), nullable=True)
    payment_instructions = Column(Text, nullable=True)
    require_id_proof = Column(Boolean, default=False, nullable=False)
    idea_ppt_required = Column(Boolean, default=False, nullable=False)
    ppt_template_url = Column(String(500), nullable=True)
    poster_url = Column(String(500), nullable=True)
    selection_mode = Column(String(40), default="MANUAL")       # MANUAL | ALLOW_ALL_ELIGIBLE_REGISTRATIONS
    status = Column(Enum(EventStatus), default=EventStatus.UPCOMING, nullable=False)
    is_seeded = Column(Boolean, default=False, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class EventCoordinator(Base):
    __tablename__ = "event_coordinators"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    faculty_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utcnow)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("event_id", "faculty_user_id", name="uq_event_coordinator"),)


class EventLeadership(Base):
    __tablename__ = "event_leadership"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(32), nullable=False)  # PRESIDENT | VICE_PRESIDENT | VOLUNTEER_COORDINATOR
    appointed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    appointed_at = Column(DateTime(timezone=True), default=utcnow)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("event_id", "student_user_id", "role", name="uq_leadership"),)

    @property
    def assigned_at(self):
        return self.appointed_at

    @assigned_at.setter
    def assigned_at(self, value):
        self.appointed_at = value


# ----------------------------- Forms ----------------------------------

class EventForm(Base):
    __tablename__ = "event_forms"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), unique=True, nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    published_version = Column(Integer, default=0)
    draft_schema_json = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class FormVersion(Base):
    __tablename__ = "event_form_versions"
    id = Column(Integer, primary_key=True)
    form_id = Column(Integer, ForeignKey("event_forms.id"), nullable=False)
    version = Column(Integer, nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    schema_json = Column(Text, nullable=False)  # immutable question schema
    published_at = Column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("form_id", "version", name="uq_form_version"),)


class Registration(Base):
    __tablename__ = "registrations"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_version = Column(Integer, nullable=False)
    registration_id = Column(String(24), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    id_proof_url = Column(String(500), nullable=True)
    answers_json = Column(Text, nullable=False)
    status = Column(String(32), default="SUBMITTED")  # SUBMITTED | WITHDRAWN | SHORTLISTED | NOT_SHORTLISTED
    payment_status = Column(String(32), default="UNPAID", nullable=False)
    payment_reference = Column(String(120), nullable=True)
    payment_receipt_url = Column(String(500), nullable=True)
    shortlisted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    shortlisted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("event_id", "student_user_id", name="uq_event_student_reg"),)


# ----------------------------- Teams ----------------------------------

class TeamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE"
    DECLINED = "DECLINED"
    COMPLETE = "COMPLETE"
    SUBMITTED = "SUBMITTED"
    SHORTLISTED = "SHORTLISTED"
    NOT_SHORTLISTED = "NOT_SHORTLISTED"


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    leader_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_name = Column(String(120), nullable=False)
    project_title = Column(String(240), nullable=True)
    problem_statement = Column(Text, nullable=True)
    proposed_solution = Column(Text, nullable=True)
    project_description = Column(Text, nullable=True)
    tech_stack = Column(Text, nullable=True)
    pitch_deck_url = Column(String(500), nullable=True)
    id_proof_url = Column(String(500), nullable=True)
    form_version = Column(Integer, nullable=True)
    answers_json = Column(Text, nullable=True)
    status = Column(Enum(TeamStatus), default=TeamStatus.DRAFT, nullable=False)
    payment_status = Column(String(32), default="UNPAID", nullable=False)
    payment_reference = Column(String(120), nullable=True)
    payment_receipt_url = Column(String(500), nullable=True)
    payment_submitted_at = Column(DateTime(timezone=True), nullable=True)
    group_joined = Column(Boolean, default=False, nullable=False)
    shortlisted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    shortlisted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class TeamInvitation(Base):
    __tablename__ = "team_invitations"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(16), default="PENDING")  # PENDING | ACCEPTED | DECLINED
    invited_at = Column(DateTime(timezone=True), default=utcnow)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    team = relationship("Team")
    __table_args__ = (UniqueConstraint("team_id", "student_user_id", name="uq_team_member"),)


# ----------------------------- Volunteers ------------------------------

class VolunteerApplication(Base):
    __tablename__ = "volunteer_applications"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skills = Column(Text, nullable=True)
    preferred_area = Column(String(120), nullable=True)
    experience = Column(Text, nullable=True)
    availability = Column(Text, nullable=True)
    answers_json = Column(Text, nullable=True)
    status = Column(String(16), default="PENDING")  # PENDING | APPROVED | REJECTED
    recommended_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (UniqueConstraint("event_id", "student_user_id", name="uq_event_volunteer"),)


class VolunteerAssignment(Base):
    __tablename__ = "volunteer_assignments"
    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("volunteer_applications.id"), nullable=False)
    responsibility = Column(String(200), nullable=True)
    allocation = Column(String(200), nullable=True)
    completion_status = Column(String(16), default="PENDING")  # PENDING | COMPLETED | NOT_COMPLETED
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    __table_args__ = (UniqueConstraint("application_id", name="uq_volunteer_assignment"),)


# ----------------------------- Attendance / winners --------------------

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    status = Column(String(16), default="NOT_MARKED")  # NOT_MARKED | PRESENT | ABSENT | REVIEW
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    marked_at = Column(DateTime(timezone=True), nullable=True)
    reason = Column(Text, nullable=True)
    __table_args__ = (UniqueConstraint("event_id", "student_user_id", name="uq_event_student_attendance"),)


class Winner(Base):
    __tablename__ = "winners"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    position = Column(Integer, nullable=False)  # 1 gold, 2 silver, 3 bronze, others numbered
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    achievement = Column(Text, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow)


# ----------------------------- Academic records -------------------------

class Internship(Base):
    __tablename__ = "internships"
    id = Column(Integer, primary_key=True)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company = Column(String(200), nullable=False)
    role = Column(String(160), nullable=True)
    start_date = Column(String(12), nullable=True)
    end_date = Column(String(12), nullable=True)
    mode = Column(String(40), nullable=True)
    location = Column(String(160), nullable=True)
    description = Column(Text, nullable=True)
    technologies = Column(Text, nullable=True)
    supervisor = Column(String(200), nullable=True)
    document_path = Column(String(400), nullable=True)
    status = Column(String(20), default="PENDING_REVIEW")  # PENDING_REVIEW | ON_HOLD | VERIFIED | REJECTED
    evidence_inspected = Column(Boolean, default=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=utcnow)


class ExternalEventRecord(Base):
    __tablename__ = "external_event_records"
    id = Column(Integer, primary_key=True)
    student_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_name = Column(String(240), nullable=False)
    organization = Column(String(200), nullable=True)
    category = Column(String(80), nullable=True)
    event_date = Column(String(12), nullable=True)
    location = Column(String(160), nullable=True)
    description = Column(Text, nullable=True)
    participation_type = Column(String(80), nullable=True)
    achievement = Column(String(240), nullable=True)
    document_path = Column(String(400), nullable=True)
    status = Column(String(20), default="PENDING_REVIEW")
    evidence_inspected = Column(Boolean, default=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=utcnow)


# ----------------------------- Notifications / audit --------------------

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String(300), nullable=True)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(80), nullable=False)
    entity = Column(String(80), nullable=True)
    entity_id = Column(Integer, nullable=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)


class ImportBatch(Base):
    __tablename__ = "import_batches"
    id = Column(Integer, primary_key=True)
    kind = Column(String(16), nullable=False)  # STUDENT | FACULTY
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_rows = Column(Integer, default=0)
    created_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)


Index("ix_attendance_event", Attendance.event_id)
Index("ix_reg_event", Registration.event_id)
Index("ix_team_event", Team.event_id)
