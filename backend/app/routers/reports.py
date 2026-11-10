"""A4 PDF reports via ReportLab. All reports are access-controlled and built from
persisted data. Report 8 contains no volunteer-hour content (feature excluded)."""
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import mm

from ..db import get_db
from ..models import (User, Event, Registration, Team, TeamInvitation, VolunteerApplication,
                      VolunteerAssignment, Attendance, Winner, Internship, ExternalEventRecord,
                      StudentProfile)
from ..deps import (require_campus_user, require_faculty, require_student, student_profile,
                    faculty_profile, is_event_coordinator, leadership_role, is_assigned_class_teacher)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

REPORT_TITLES = {
    "event_executive": "Complete Event Executive Report",
    "participants": "Approved Individual Participant List",
    "teams": "Complete Team Registration Details",
    "dept_participants": "Department-wise Participant List",
    "attendance": "Participant Attendance Register",
    "volunteer_applications": "Volunteer Applications",
    "volunteer_allocations": "Volunteer Allocations and Responsibilities",
    "volunteer_completion": "Volunteer Completion and Recognition",
    "event_summary": "Final Event Summary",
    "winners": "Winners and Medal Summary",
    "semester_register": "Semester-wise Student Register",
    "section_register": "Section-wise Student Register",
    "internships": "Internship Students",
    "verified_internships": "Verified Internship",
    "external_events": "External Event Participation",
    "external_verification": "External Event Verification",
    "comprehensive_extract": "Comprehensive Academic Activity Extract",
}


def build_pdf(title: str, sections: list[tuple[str, list[list[str]]]]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm, title=title)
    styles = getSampleStyleSheet()
    story = [Paragraph(f"Vidyavardhaka College of Engineering (VVCE)", styles["Title"]),
             Paragraph(title, styles["Heading2"]),
             Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} | EventXTracker", styles["Normal"]),
             Spacer(1, 6)]
    for heading, rows in sections:
        story.append(Paragraph(heading, styles["Heading3"]))
        if rows:
            t = Table([rows[0]] + rows[1:], repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
            ]))
            story.append(t)
        story.append(Spacer(1, 8))
    doc.build(story)
    buf.seek(0)
    return buf.read()


def get_event_for(user, db, event_id, require_faculty_manage=False):
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found")
    if require_faculty_manage and not is_event_coordinator(db, event_id, user.id):
        raise HTTPException(403, "Not an event coordinator")
    return ev


@router.get("/{report_type}")
def report(report_type: str, event_id: int = 0, department: str = "", semester: int = 0, section: str = "",
           db: Session = Depends(get_db), user: User = Depends(require_campus_user)):
    if report_type not in REPORT_TITLES:
        raise HTTPException(404, "Unknown report")
    title = REPORT_TITLES[report_type]
    sections = []

    if report_type in ("event_executive", "participants", "teams", "dept_participants", "attendance",
                       "volunteer_applications", "volunteer_allocations", "volunteer_completion",
                       "event_summary", "winners"):
        ev = get_event_for(user, db, event_id, require_faculty_manage=True)
        regs = db.query(Registration).filter_by(event_id=event_id).all()
        teams = db.query(Team).filter_by(event_id=event_id).all()
        if report_type == "event_executive":
            sections.append(("Event", [["Field", "Value"], ["Name", ev.name], ["Status", ev.status.value],
                                       ["Venue", ev.venue or "-"], ["Start", ev.start_at.isoformat()], ["End", ev.end_at.isoformat()]]))
            sections.append(("Registrations", [["Reg ID", "Student", "Status"]] + [
                [r.registration_id, r.student_user_id, r.status] for r in regs] or [["-", "-", "-"]]))
            sections.append(("Teams", [["Team", "Leader", "Status"]] + [
                [t.team_name, t.leader_user_id, t.status.value] for t in teams] or [["-", "-", "-"]]))
        elif report_type == "participants":
            rows = [["Reg ID", "USN", "Name", "Status"]]
            for r in regs:
                if r.status == "SHORTLISTED":
                    sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
                    if not sp:
                        continue
                    rows.append([r.registration_id, sp.usn, sp.full_name, r.status])
            sections.append(("Shortlisted individual participants", rows))
        elif report_type == "teams":
            rows = [["Team", "Project", "Status", "Members"]]
            for t in teams:
                members = db.query(TeamInvitation).filter_by(team_id=t.id, status="ACCEPTED").count()
                rows.append([t.team_name, t.project_title or "-", t.status.value, str(members)])
            sections.append(("Teams", rows))
        elif report_type == "dept_participants":
            rows = [["USN", "Name", "Department", "Semester", "Section"]]
            for r in regs:
                sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
                if not sp:
                    continue
                dept_code = sp.department.code if sp.department else "-"
                if department and dept_code != department:
                    continue
                rows.append([sp.usn, sp.full_name, dept_code, str(sp.current_semester), sp.section])
            sections.append(("Participants", rows))
        elif report_type == "attendance":
            rows = [["USN", "Name", "Dept", "Sem", "Sec", "Team", "Status"]]
            for a in db.query(Attendance).filter_by(event_id=event_id).all():
                sp = db.query(StudentProfile).filter_by(user_id=a.student_user_id).first()
                if not sp:
                    continue
                dept_code = sp.department.code if sp.department else "-"
                rows.append([sp.usn, sp.full_name, dept_code, str(sp.current_semester),
                             sp.section, str(a.team_id or "-"), a.status])
            sections.append(("Attendance register", rows))
        elif report_type == "volunteer_applications":
            rows = [["Student", "Skills", "Preferred area", "Status"]]
            for v in db.query(VolunteerApplication).filter_by(event_id=event_id).all():
                sp = db.query(StudentProfile).filter_by(user_id=v.student_user_id).first()
                if not sp:
                    continue
                rows.append([sp.full_name, v.skills or "-", v.preferred_area or "-", v.status])
            sections.append(("Volunteer applications", rows))
        elif report_type == "volunteer_allocations":
            rows = [["Student", "Responsibility", "Allocation"]]
            for va in db.query(VolunteerAssignment).all():
                app = db.get(VolunteerApplication, va.application_id)
                if app and app.event_id == event_id:
                    sp = db.query(StudentProfile).filter_by(user_id=app.student_user_id).first()
                    if not sp:
                        continue
                    rows.append([sp.full_name, va.responsibility or "-", va.allocation or "-"])
            sections.append(("Allocations", rows))
        elif report_type == "volunteer_completion":
            rows = [["Student", "Completion status"]]
            for va in db.query(VolunteerAssignment).all():
                app = db.get(VolunteerApplication, va.application_id)
                if app and app.event_id == event_id:
                    sp = db.query(StudentProfile).filter_by(user_id=app.student_user_id).first()
                    if not sp:
                        continue
                    rows.append([sp.full_name, va.completion_status])
            sections.append(("Completion", rows))
        elif report_type == "event_summary":
            sections.append(("Summary", [["Metric", "Count"],
                ["Registrations", str(len(regs))], ["Teams", str(len(teams))],
                ["Attendance marked", str(db.query(Attendance).filter_by(event_id=event_id).filter(Attendance.status != "NOT_MARKED").count())],
                ["Winners", str(db.query(Winner).filter_by(event_id=event_id).count())]]))
        elif report_type == "winners":
            rows = [["Position", "Student/Team", "Achievement"]]
            for w in db.query(Winner).filter_by(event_id=event_id).order_by(Winner.position).all():
                who = f"Student #{w.student_user_id}" if w.student_user_id else f"Team #{w.team_id}"
                rows.append([str(w.position), who, w.achievement or "-"])
            sections.append(("Winners", rows))
    else:
        # Academic / register reports — Model B or department-scoped
        rows = [["USN", "Name", "Dept", "Sem", "Sec", "Status"]]
        if report_type in ("semester_register", "section_register", "comprehensive_extract"):
            q = db.query(StudentProfile)
            if user.account_type.value == "FACULTY":
                fp = faculty_profile(db, user)
                q = q.filter_by(department_id=fp.department_id)
            if report_type == "semester_register" and semester:
                q = q.filter_by(current_semester=semester)
            if report_type == "section_register" and section:
                q = q.filter_by(section=section)
            for sp in q.all():
                rows.append([sp.usn, sp.full_name, sp.department.code, str(sp.current_semester), sp.section, "-"])
        else:
            model = Internship if "internship" in report_type else ExternalEventRecord
            verified_only = "verified" in report_type or "verification" in report_type
            for r in db.query(model).all():
                sp = db.query(StudentProfile).filter_by(user_id=r.student_user_id).first()
                if not sp:
                    continue
                dept_code = sp.department.code if sp.department else "-"
                if user.account_type.value == "FACULTY":
                    fp = faculty_profile(db, user)
                    if not fp or fp.department_id != sp.department_id:
                        continue
                    if r.status == "PENDING_REVIEW" and not is_assigned_class_teacher(db, user.id, sp, "2025-26"):
                        continue
                if verified_only and r.status != "VERIFIED":
                    continue
                rows.append([sp.usn, sp.full_name, dept_code, str(sp.current_semester), sp.section, r.status])
        sections.append((title, rows))

    pdf = build_pdf(title, sections)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{report_type}.pdf"'})
