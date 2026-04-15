# Product Requirements Document (PRD)

## Product Name
PullFund - Startup Ecosystem Directory

## 1. Product Overview
PullFund is a web-based platform that aggregates Incubators, Accelerators, and VC Funds in one searchable directory. It helps founders discover relevant programs and funds quickly through sector-based filtering and a visual, color-coded application deadline calendar.

## 2. Target Audience
- Early-stage founders looking for mentorship and initial capital.
- Growth-stage startups seeking Series A/B funding opportunities.
- Ecosystem builders and analysts tracking startup support activity and trends.

## 3. Problem Statement
Founders currently navigate fragmented sources to find relevant incubators, accelerators, and VC funds. Deadlines are hard to track, opportunities are missed, and comparison across programs is inefficient.

## 4. Goals and Objectives
- Centralize startup support entities in one trusted directory.
- Reduce time to discover relevant opportunities by sector and stage.
- Increase founder action through clear application timelines and direct apply links.
- Build a scalable data workflow for continuous listing updates.

## 5. Core User Features

### 5.1 Discovery and Filtering
- **Category Tabs:** Separate views for:
  - Incubators
  - Accelerators
  - VC Funds
- **Sector Tagging:** Multi-select sector filters (examples: Tech, AI, Fintech, SaaS, D2C, HealthTech).
- **Search Bar:** Global search across entity names and program/fund keywords.

### 5.2 Application Calendar (Core Feature)
- **Visual Timeline:** Monthly grid or horizontal timeline displaying active and upcoming windows.
- **Color Coding:**
  - Green: Accepting applications
  - Yellow: Deadline approaching (within 14 days)
  - Gray: Closed or rolling basis
- **Calendar Sync:** "Add to Calendar" on individual deadlines:
  - Google Calendar
  - Outlook
  - iCal

### 5.3 Entity Detail Pages
- **Profile Data:** Description, investment thesis, ticket size, and notable portfolio companies.
- **Primary CTA:** Prominent "Apply Now" button linking to external application portal.

## 6. Technical Requirements

### 6.1 Data Schema
The database must support many-to-many relationships (for example, one VC can map to multiple sectors).

| Field | Type | Description |
|---|---|---|
| name | String | Name of the entity |
| type | Enum | Incubator, Accelerator, or VC |
| sectors | Array | Tags (example: ["AI", "SaaS"]) |
| app_start | Date | Application opening date |
| app_end | Date | Application closing date |
| is_rolling | Boolean | If true, overrides specific dates |

### 6.2 Automation and Maintenance
- **Submission Portal:** Public form for organizations to submit or update listings.
- **Admin Dashboard:** Private interface for owner/admin to approve, edit, reject, or delete listings.

## 7. UI and UX Requirements
- **Clean and Professional:** Minimalist, high-density information layout with clear hierarchy.
- **Mobile Responsive:** Calendar view collapses into a list view on mobile for usability.
- **Hover Quick Look:** Hovering over a calendar item displays a lightweight tooltip with key details.

## 8. Success Metrics (KPIs)
- **Traffic:** Monthly Active Users (MAU).
- **Engagement:** Number of "Apply Now" clicks (CTR to external sites).
- **Retention:** Returning users who revisit the calendar month-over-month.

## 9. Future Roadmap
- **V2:** User accounts with watchlists for selected funds/programs.
- **V3:** Sector-interest-based email newsletter automation.
- **V4:** LinkedIn integration to surface alumni connections with specific programs.

## 10. Assumptions and Constraints
- External links and deadlines are maintained through admin moderation and organization submissions.
- Initial launch prioritizes readability and discovery over personalization.
- Timeline status logic should be deterministic and consistent across timezone handling.

