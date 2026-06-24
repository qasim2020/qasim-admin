# CMS Schema Reference

11 tables. Database: **PostgreSQL**. Images: **Cloudflare R2** (S3-compatible).

---

## Access Control Legend

| Symbol | Meaning |
|---|---|
| 🌐 Public read | Unauthenticated GraphQL queries can read |
| 🔒 Admin read | Must be signed in to query |
| ✏️ Admin write | Must be signed in to create / update / delete |
| 📬 Public create | Unauthenticated clients can create (e.g. signup forms) |
| 👁 Filter | Unauthenticated queries auto-filtered to `status = published` |

---

## 1. User

> Admin accounts only. No public access.

**Access:** 🔒 Admin read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Required |
| `email` | Text | Required · Unique |
| `password` | Password | Required · Hashed |
| `createdAt` | Timestamp | Defaults to now |

---

## 2. Blog

> Blog posts. Drafts hidden from unauthenticated API consumers.

**Access:** 🌐 Public read · ✏️ Admin write · 👁 Filter (`status = published`)

| Field | Type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required · Unique · Used in URLs |
| `excerpt` | Text (textarea) | Short preview for listing pages |
| `content` | Rich Text (Document) | Full post body |
| `coverImage` | Image | Stored in Cloudflare R2 |
| `status` | Select | `draft` (default) · `published` |
| `publishedAt` | Timestamp | |
| `featured` | Checkbox | Default `false` |
| `readTimeMinutes` | Integer | |
| `author` | → User | Many-to-one |
| `tags` | → Tag[] | Many-to-many |
| `categories` | → Category[] | Many-to-many |
| `seoTitle` | Text | |
| `seoDescription` | Text (textarea) | |

---

## 3. Project

> Portfolio projects. Drafts hidden from unauthenticated API consumers.

**Access:** 🌐 Public read · ✏️ Admin write · 👁 Filter (`status = published`)

| Field | Type | Notes |
|---|---|---|
| `title` | Text | Required |
| `slug` | Text | Required · Unique · Used in URLs |
| `description` | Text (textarea) | Short summary for cards |
| `content` | Rich Text (Document) | Full case study body |
| `coverImage` | Image | Stored in Cloudflare R2 |
| `techStack` | JSON | Array of technology names e.g. `["Next.js","Postgres"]` |
| `githubUrl` | Text | |
| `liveUrl` | Text | |
| `featured` | Checkbox | Default `false` |
| `status` | Select | `draft` (default) · `published` |
| `publishedAt` | Timestamp | |
| `order` | Integer | Manual display ordering. Default `0` |
| `tags` | → Tag[] | Many-to-many |
| `categories` | → Category[] | Many-to-many |
| `seoTitle` | Text | |
| `seoDescription` | Text (textarea) | |

---

## 4. Tag

> Lightweight labels shared across Blog and Project.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Required |
| `description` | Text (textarea) | |
| `blogs` | → Blog[] | Back-relation |
| `projects` | → Project[] | Back-relation |

---

## 5. Category

> Broader groupings for Blog and Project content.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Required |
| `slug` | Text | Required · Unique |
| `description` | Text (textarea) | |
| `type` | Select | `blog` · `project` · `both` (default) |
| `blogs` | → Blog[] | Back-relation |
| `projects` | → Project[] | Back-relation |

---

## 6. Subscriber

> Newsletter subscribers. Portfolio signup forms can write without auth.

**Access:** 🔒 Admin read · 📬 Public create · ✏️ Admin write/delete

| Field | Type | Notes |
|---|---|---|
| `email` | Text | Required · Unique |
| `name` | Text | |
| `status` | Select | `active` (default) · `unsubscribed` · `bounced` |
| `subscribedAt` | Timestamp | Defaults to now |
| `unsubscribedAt` | Timestamp | Set when subscriber opts out |
| `source` | Text | e.g. `"portfolio-footer"`, `"blog-cta"` |
| `unsubscribeToken` | Text | UUID · Unique · Hidden in Admin UI · Auto-generated on create |

---

## 7. Newsletter

> Email campaigns. Changing `status` to `sent` triggers Resend delivery automatically.

**Access:** 🔒 Admin read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `title` | Text | Required · Internal name |
| `subject` | Text | Required · Email subject line |
| `previewText` | Text | Email preview/snippet text |
| `content` | Rich Text (Document) | Web-viewable version |
| `bodyHtml` | Text (textarea) | HTML sent in the email. Falls back to subject if blank |
| `status` | Select | `draft` (default) · `sent` — changing to `sent` triggers send |
| `sentAt` | Timestamp | Read-only · Set automatically after send |
| `recipientCount` | Integer | Read-only · Set automatically after send |

---

## 8. WorkExperience

> Job history for the resume / about page.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `company` | Text | Required |
| `role` | Text | Required |
| `startDate` | Timestamp | Required |
| `endDate` | Timestamp | Null = current position |
| `current` | Checkbox | Default `false` |
| `description` | Rich Text (Document) | Bullet points, responsibilities |
| `companyUrl` | Text | |
| `companyLogo` | Image | Stored in Cloudflare R2 |
| `order` | Integer | Manual display ordering. Default `0` |

---

## 9. Skill

> Technical skills / technologies for the portfolio.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Required |
| `category` | Select | `frontend` · `backend` · `devops` · `database` · `design` · `other` (default) |
| `proficiency` | Select | `beginner` · `intermediate` (default) · `advanced` · `expert` |
| `icon` | Text | Icon name or SVG string |
| `order` | Integer | Manual display ordering. Default `0` |

---

## 10. SiteSettings *(singleton)*

> Global site configuration. Only one record is allowed.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `fullName` | Text | |
| `tagline` | Text | |
| `bio` | Rich Text (Document) | |
| `profilePhoto` | Image | Stored in Cloudflare R2 |
| `resumeUrl` | Text | Link to downloadable CV |
| `contactEmail` | Text | |
| `githubUrl` | Text | |
| `linkedinUrl` | Text | |
| `twitterUrl` | Text | |
| `youtubeUrl` | Text | |
| `instagramUrl` | Text | |

---

## 11. Testimonial

> Social proof quotes for the portfolio.

**Access:** 🌐 Public read · ✏️ Admin write

| Field | Type | Notes |
|---|---|---|
| `author` | Text | Required |
| `role` | Text | |
| `company` | Text | |
| `content` | Text (textarea) | Required · The quote |
| `avatar` | Image | Stored in Cloudflare R2 |
| `featured` | Checkbox | Default `false` |
| `order` | Integer | Manual display ordering. Default `0` |

---

## Relationships Summary

```
Blog      ──┤ many-to-many ├── Tag
Project   ──┤ many-to-many ├── Tag

Blog      ──┤ many-to-many ├── Category
Project   ──┤ many-to-many ├── Category

Blog      ──┤ many-to-one  ├── User  (author)
```
