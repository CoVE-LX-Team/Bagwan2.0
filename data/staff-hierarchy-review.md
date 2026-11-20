# People directory and reporting lines

**Review status: pending Bagwan SME and Senior Learning Designer review.** This is an archival reconstruction for the hospital simulation. Andrew and the SME can record approved corrections in `staff-hierarchy.json`. Running `python3 scripts/build_v3.py` incorporates them into the 3.0 site.

The archive supports 142 position records across 11 departments or services. They contain 126 distinct personal names, ten roles with an unidentified holder and 110 reporting links. Six names occur in more than one position. Each position has its own ID so a reporting line follows the particular appointment. A blank manager means the available evidence leaves that line open. The CEO heads the hospital overview.

## Where the records came from

The Bagwan WordPress backup dated 14 April 2025 contains the organisation-chart fields and Staff List records. Each position's `source_refs` identifies the original WordPress post IDs. A `chart` reference points to an organisation chart. A `directory` reference points to a Staff List item. `source_page` links to the corresponding migrated chart where one exists.

| WordPress chart post | Area | Evidence used |
| --- | --- | --- |
| 489 | Hospital organisation chart | Named CEO and five named executive reporting lines. Other boxes identify departments only. |
| 577, 581, 582 | Emergency, Laboratory, Interpreting | Department head, direct reports, and roles nested under each named manager. Chart 606 identifies the four laboratory roles under Jack Davies. |
| 583, 584, 585, 586, 587 | Administration, IT services, People and Culture, Finance, Logistics and emergency preparedness | Head, manager and staff fields. Some second-level names exist in the archive even where the website displayed only the role title. |
| 814 | Nursing overview | Chief Nurse and the four unit-manager reporting lines corroborated by their unit charts. |
| 589, 591, 593, 595, 604 | Outpatient, Inpatient, Cardiac, Emergency and Rehabilitation nursing | Named unit managers, staff and roles. Department and unit are recorded separately. |
| Staff List | Department roster | 119 published Bagwan items. Five school examples supplied with the plugin were excluded. Four staff members are listed for the Aboriginal and Torres Strait Islander liaison office. The available records do not specify their supervisors. |

Where a chart gives only a role, a unique match on department and role in the roster can identify its holder. These records cite both sources and say how the name was matched. Conflicting positions, alternative reporting lines and repeated roles stay open. The 35 portraits come from images explicitly attached to named people in the Bagwan charts.

## Questions for the SME and Andrew

| Area | Decision requested |
| --- | --- |
| Executive leadership | Confirm individual managers for clinical department heads. The hospital overview names Emergency, Nursing, Laboratory and Interpreting as services reporting to the CEO. It does not identify personal reporting lines for their heads. |
| Nursing | Confirm the Emergency unit manager and their manager. The unit chart and staff directory give Romeo Knight. The overview includes another spelling and a second branch with an unnamed manager. The outpatient unit chart and directory agree on Annanya Shvetank and Beatrice Fraser's roles, which differ in the overview. |
| People and Culture | Confirm the OHS appointment. The linked chart names Henry Natana, the staff directory names Tom Penn, and an older chart (659) names Urangi Natana. |
| IT services and Interpreting | Confirm the different positions attached to Rosalind Hyams and Alagesan Poduri. The hospital overview and directory spell the CTO's name Emmie Hunt, while the IT chart uses Emmi. Older charts 608 and 671 also assign some technical and interpreting roles to different managers. |
| Finance and Administration | Confirm the differing finance leaders and roles in chart 586, older chart 668 and the directory, including the positions of Nicole Pires and Vitória Brito. The administration sources assign different facilities positions to Dionissia Speraki. |
| Logistics | Confirm the two directory appointments under Ayla Hood, the name order of Waraki Piripi and the repeated Medical Staff Unit Leader row. The Logistics Chief also appeared as their own direct report in chart 587. This duplicate was removed. |
| Liaison and Allied health | Confirm the liaison team's reporting lines and who holds Allied health positions. Allied health appears as a department label with no identified staff in the source chart. |

The earlier 40-person directory was compiled from the visible department pages. The 3.0 hierarchy includes the names and positions recovered from the underlying source records.
