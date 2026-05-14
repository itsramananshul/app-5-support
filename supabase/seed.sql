-- APP 5 — Support Tickets: seed for 6 instances × 10 tickets = 60 rows.
-- Run AFTER schema.sql. Idempotent upsert on (instance_name, ticket_number).
-- Re-run to reset to seed values.
--
-- Today (in the demo): 2026-05-13. Each instance has:
--   • at least one CRITICAL + OPEN ticket → /api/status reports degraded
--   • at least two OPEN tickets total
--   • at least one ticket with resolved_at = today → "Resolved Today" shows > 0

insert into public.support_tickets
  (instance_name, ticket_number, title, description,
   category, severity, status,
   assigned_to, reported_by, resolution, resolved_at)
values
  -- ─── Factory 1 ──────────────────────────────────────────────────────
  ('Factory 1','TKT-F1-001','CNC Mill #3 spindle bearing failure',         'Vibration over 6 mm/s; production halted on Line A.', 'EQUIPMENT','CRITICAL','OPEN',       'Mike Torres','Foreman A. Patel','',NULL),
  ('Factory 1','TKT-F1-002','Conveyor belt #2 jamming intermittently',     'Triggers every 30 min; manual reset required.',        'EQUIPMENT','HIGH',    'IN_PROGRESS','Sarah Chen','QA J. Watson','',NULL),
  ('Factory 1','TKT-F1-003','Ethernet drop in Bay 4 down',                 'No link on cabinet port; switch port LED off.',        'IT',       'MEDIUM',  'OPEN',       'James Okafor','Tech R. Singh','',NULL),
  ('Factory 1','TKT-F1-004','Forklift FL-12 brake fluid low',              'Reservoir under min line; brake feel soft.',           'SAFETY',   'HIGH',    'RESOLVED',   'Mike Torres','Op L. Garcia','Topped up and pressure-tested', '2026-05-13T09:15:00Z'),
  ('Factory 1','TKT-F1-005','HVAC zone 3 not cooling',                     'Zone 3 at 82°F vs setpoint 68°F.',                     'EQUIPMENT','MEDIUM',  'RESOLVED',   'Sarah Chen','Foreman A. Patel','Replaced compressor fan',         '2026-05-10T16:22:00Z'),
  ('Factory 1','TKT-F1-006','Quality alert: 2% defect rate on Line A',     'Above 1% threshold for 3 consecutive lots.',           'QUALITY',  'HIGH',    'IN_PROGRESS','Unassigned','QA J. Watson','',NULL),
  ('Factory 1','TKT-F1-007','Inventory discrepancy in Bin 22-A',           '12 units short vs WMS count.',                         'GENERAL',  'LOW',     'OPEN',       'Unassigned','Op L. Garcia','',NULL),
  ('Factory 1','TKT-F1-008','ERP terminal login failures',                 'Multiple ops unable to clock in this morning.',        'IT',       'MEDIUM',  'CLOSED',     'James Okafor','Tech R. Singh','AD password sync fixed',         '2026-05-05T11:00:00Z'),
  ('Factory 1','TKT-F1-009','Shift handover log missing entries',          'Gaps on Sunday/Monday night shift.',                   'GENERAL',  'LOW',     'CLOSED',     'Sarah Chen','Foreman A. Patel','Template reviewed with team',     '2026-05-08T07:30:00Z'),
  ('Factory 1','TKT-F1-010','Safety: missing PPE sign at Bay 7',           'Visitor walkthrough flagged missing eye-pro sign.',    'SAFETY',   'MEDIUM',  'RESOLVED',   'Mike Torres','Safety Officer','Sign installed and verified',     '2026-05-13T11:45:00Z'),

  -- ─── Factory 2 ──────────────────────────────────────────────────────
  ('Factory 2','TKT-F2-001','Press #5 hydraulic leak',                     'Floor staining at base; pressure cycling.',            'EQUIPMENT','CRITICAL','OPEN',       'Sarah Chen','Foreman M. Lee','',NULL),
  ('Factory 2','TKT-F2-002','Wifi outage in receiving area',               'No coverage along south wall since 06:00.',            'IT',       'HIGH',    'IN_PROGRESS','James Okafor','Tech R. Singh','',NULL),
  ('Factory 2','TKT-F2-003','Forklift FL-08 not starting',                 'Battery shows 11.6 V; charger reports fault.',         'EQUIPMENT','HIGH',    'OPEN',       'Mike Torres','Op T. Brown','',NULL),
  ('Factory 2','TKT-F2-004','QA: dimensional check failure batch 207',     'Outer diameter 0.4 mm over spec.',                     'QUALITY',  'HIGH',    'IN_PROGRESS','Unassigned','QA J. Watson','',NULL),
  ('Factory 2','TKT-F2-005','Loading dock door sensor jam',                'Door stuck open; sensor not detecting.',               'EQUIPMENT','MEDIUM',  'RESOLVED',   'Sarah Chen','Op T. Brown','Sensor replaced',                  '2026-05-12T14:00:00Z'),
  ('Factory 2','TKT-F2-006','ERP report timeout when running EOD',         'Daily sales export crashes after 8 min.',              'IT',       'MEDIUM',  'CLOSED',     'James Okafor','Tech R. Singh','Query optimized; EOD now 8 min', '2026-05-09T18:00:00Z'),
  ('Factory 2','TKT-F2-007','First aid kit restock',                       'Two kits below 50% checklist compliance.',             'SAFETY',   'LOW',     'RESOLVED',   'Mike Torres','Safety Officer','Two kits restocked, audit done',  '2026-05-13T08:20:00Z'),
  ('Factory 2','TKT-F2-008','Shift schedule overlap on Tuesday',           'Two shifts double-booked Bay 3.',                      'GENERAL',  'LOW',     'OPEN',       'Unassigned','Foreman M. Lee','',NULL),
  ('Factory 2','TKT-F2-009','Lighting flicker in Aisle 3',                 'Triggers migraine complaints.',                        'EQUIPMENT','LOW',     'CLOSED',     'Mike Torres','Op T. Brown','Ballast replaced',                 '2026-05-04T15:00:00Z'),
  ('Factory 2','TKT-F2-010','Pallet wrapper jam',                          'Film breaking every 3rd pallet.',                      'EQUIPMENT','MEDIUM',  'RESOLVED',   'Sarah Chen','Op T. Brown','Cleared jam; lubricated rollers',  '2026-05-11T10:30:00Z'),

  -- ─── Factory 3 — many critical / safety issues ──────────────────────
  ('Factory 3','TKT-F3-001','CNC #1 sudden power-loss; production halted', 'Breaker tripped twice today.',                         'EQUIPMENT','CRITICAL','OPEN',       'Mike Torres','Foreman D. Wong','',NULL),
  ('Factory 3','TKT-F3-002','Robotics cell controller fault code E-47',    'Servo overcurrent on joint 4.',                        'EQUIPMENT','CRITICAL','OPEN',       'Sarah Chen','Tech R. Singh','',NULL),
  ('Factory 3','TKT-F3-003','Chemical spill in Bay 2 — contained',         '~2L coolant; absorbent applied.',                      'SAFETY',   'HIGH',    'IN_PROGRESS','Unassigned','Safety Officer','',NULL),
  ('Factory 3','TKT-F3-004','Hot work permit overdue review',              'Welding crew waiting on sign-off.',                    'SAFETY',   'MEDIUM',  'OPEN',       'Unassigned','Safety Officer','',NULL),
  ('Factory 3','TKT-F3-005','Server room AC alarm',                        'Inlet 28°C; setpoint 22°C.',                           'IT',       'HIGH',    'RESOLVED',   'James Okafor','Tech R. Singh','Filter cleaned, alarm cleared',   '2026-05-13T06:55:00Z'),
  ('Factory 3','TKT-F3-006','Conveyor belt encoder drift',                 '+0.5% per shift; tracking misalignment.',              'EQUIPMENT','MEDIUM',  'IN_PROGRESS','Mike Torres','Foreman D. Wong','',NULL),
  ('Factory 3','TKT-F3-007','QA: surface finish out of tolerance',         'Ra > 1.6μm on aerospace lot.',                         'QUALITY',  'HIGH',    'OPEN',       'Sarah Chen','QA J. Watson','',NULL),
  ('Factory 3','TKT-F3-008','Time clock terminal offline',                 'Bay 1 terminal LED red.',                              'IT',       'LOW',     'CLOSED',     'James Okafor','Tech R. Singh','Network cable replaced',           '2026-05-06T08:00:00Z'),
  ('Factory 3','TKT-F3-009','Tooling tracking spreadsheet errors',         'Formula breaks when inserting rows.',                  'GENERAL',  'LOW',     'RESOLVED',   'Sarah Chen','Foreman D. Wong','Migrated to ERP tooling module',  '2026-05-10T13:30:00Z'),
  ('Factory 3','TKT-F3-010','Eye-wash station inspection overdue',         'Tag last dated 60 days ago.',                          'SAFETY',   'MEDIUM',  'CLOSED',     'Mike Torres','Safety Officer','Inspected and tagged',             '2026-05-07T09:15:00Z'),

  -- ─── Factory 4 — IT-heavy, high throughput ──────────────────────────
  ('Factory 4','TKT-F4-001','MES system slowdowns affecting all lines',    'Avg query >12s; production logging behind.',           'IT',       'CRITICAL','OPEN',       'James Okafor','Foreman B. Yu','',NULL),
  ('Factory 4','TKT-F4-002','High vibration on press #2',                  '8 mm/s rms; trending up.',                             'EQUIPMENT','HIGH',    'IN_PROGRESS','Mike Torres','Tech R. Singh','',NULL),
  ('Factory 4','TKT-F4-003','QA: weld penetration failures on Line C',     '3 consecutive lots failed cross-section.',             'QUALITY',  'CRITICAL','OPEN',       'Sarah Chen','QA J. Watson','',NULL),
  ('Factory 4','TKT-F4-004','Software crash on dashboards (loop)',         'OpsView page crashes every 5 min.',                    'IT',       'HIGH',    'IN_PROGRESS','James Okafor','Tech R. Singh','',NULL),
  ('Factory 4','TKT-F4-005','Forklift charger ground fault',               'GFCI tripping under load.',                            'SAFETY',   'HIGH',    'RESOLVED',   'Mike Torres','Op T. Brown','GFCI replaced, charger re-tested', '2026-05-12T17:45:00Z'),
  ('Factory 4','TKT-F4-006','Air compressor #3 unloader failed',           'Compressor runs but no flow.',                         'EQUIPMENT','MEDIUM',  'IN_PROGRESS','Sarah Chen','Foreman B. Yu','',NULL),
  ('Factory 4','TKT-F4-007','Operator training records out of date',       '12 ops past annual refresher.',                        'GENERAL',  'LOW',     'OPEN',       'Unassigned','HR Coordinator','',NULL),
  ('Factory 4','TKT-F4-008','Tool-room access card not working',           'Op T. Brown locked out of tool crib.',                 'IT',       'LOW',     'RESOLVED',   'James Okafor','Op T. Brown','Re-provisioned access',            '2026-05-13T10:05:00Z'),
  ('Factory 4','TKT-F4-009','Coolant filter sock change overdue',          'Last changed 45 days ago.',                            'EQUIPMENT','MEDIUM',  'CLOSED',     'Mike Torres','Tech R. Singh','Filter changed',                   '2026-05-09T07:20:00Z'),
  ('Factory 4','TKT-F4-010','Shift handover whiteboard reorganized',       'Mixed handover formats across crews.',                 'GENERAL',  'LOW',     'CLOSED',     'Sarah Chen','Foreman B. Yu','New template adopted',             '2026-05-08T05:40:00Z'),

  -- ─── Warehouse 1 ────────────────────────────────────────────────────
  ('Warehouse 1','TKT-W1-001','Forklift FL-22 hydraulic failure',          'Mast will not raise under load.',                      'EQUIPMENT','CRITICAL','OPEN',       'Mike Torres','Op K. Singh','',NULL),
  ('Warehouse 1','TKT-W1-002','Wireless scanner pairing issue',            '3 scanners drop pairing every 10 min.',                'IT',       'HIGH',    'IN_PROGRESS','James Okafor','Op M. Davis','',NULL),
  ('Warehouse 1','TKT-W1-003','Pallet rack damage in aisle 12',            'Upright base bent — load reduction posted.',           'SAFETY',   'HIGH',    'OPEN',       'Unassigned','Foreman R. Allen','',NULL),
  ('Warehouse 1','TKT-W1-004','Inventory count discrepancy bin C-44',      '40 units short on SKU FAS-BLK-010.',                   'GENERAL',  'MEDIUM',  'OPEN',       'Sarah Chen','Op M. Davis','',NULL),
  ('Warehouse 1','TKT-W1-005','Loading dock heater not working',           'Dock 4 cold during inbound; driver complaint.',        'EQUIPMENT','LOW',     'RESOLVED',   'Mike Torres','Op K. Singh','Element replaced',                  '2026-05-11T12:00:00Z'),
  ('Warehouse 1','TKT-W1-006','WMS report missing line items',             'Daily picks report shows 3 missing rows.',             'IT',       'MEDIUM',  'IN_PROGRESS','James Okafor','Foreman R. Allen','',NULL),
  ('Warehouse 1','TKT-W1-007','Safety: emergency exit blocked',            'Pallet partially blocked exit door near aisle 9.',     'SAFETY',   'CRITICAL','RESOLVED',   'Mike Torres','Safety Officer','Pallet relocated; daily walkthrough added','2026-05-13T07:30:00Z'),
  ('Warehouse 1','TKT-W1-008','QC: damaged cartons on inbound from supplier','15% of cartons crushed on arrival.',                 'QUALITY',  'MEDIUM',  'RESOLVED',   'Sarah Chen','QA J. Watson','Supplier credit issued; new packing','2026-05-12T16:00:00Z'),
  ('Warehouse 1','TKT-W1-009','Wifi dropouts in receiving',                'AP power-cycle 4× yesterday.',                         'IT',       'LOW',     'CLOSED',     'James Okafor','Op M. Davis','Access point relocated',           '2026-05-07T10:00:00Z'),
  ('Warehouse 1','TKT-W1-010','Battery charger station — missing label',   'No "wear PPE" sign on charger bank.',                  'SAFETY',   'LOW',     'CLOSED',     'Mike Torres','Safety Officer','Label added',                      '2026-05-09T09:00:00Z'),

  -- ─── Warehouse 2 ────────────────────────────────────────────────────
  ('Warehouse 2','TKT-W2-001','Bay 4 dock plate stuck',                    'Plate jammed half-deployed; bay closed.',              'EQUIPMENT','HIGH',    'OPEN',       'Unassigned','Op P. Nguyen','',NULL),
  ('Warehouse 2','TKT-W2-002','Refrigerated section temp alarm',           'Setpoint 4°C; reading 9°C and climbing.',              'EQUIPMENT','CRITICAL','OPEN',       'Mike Torres','Foreman E. Adams','',NULL),
  ('Warehouse 2','TKT-W2-003','Print server queue stuck',                  '40+ label jobs queued.',                               'IT',       'MEDIUM',  'IN_PROGRESS','James Okafor','Op P. Nguyen','',NULL),
  ('Warehouse 2','TKT-W2-004','Safety eyewash station leak',                'Slow drip from supply line.',                          'SAFETY',   'MEDIUM',  'OPEN',       'Sarah Chen','Safety Officer','',NULL),
  ('Warehouse 2','TKT-W2-005','Pallet wrapper sensor failing',             'Wrap cycle aborts intermittently.',                    'EQUIPMENT','LOW',     'RESOLVED',   'Mike Torres','Op P. Nguyen','Sensor cleaned and recalibrated',  '2026-05-13T13:10:00Z'),
  ('Warehouse 2','TKT-W2-006','QA: short ship on SKU FAS-BLK-010',         'Customer reported 200 unit shortfall.',                'QUALITY',  'MEDIUM',  'IN_PROGRESS','Sarah Chen','QA J. Watson','',NULL),
  ('Warehouse 2','TKT-W2-007','Forklift FL-31 tire wear',                  'Drive tires below replacement threshold.',             'EQUIPMENT','LOW',     'RESOLVED',   'Mike Torres','Op P. Nguyen','Tires rotated',                    '2026-05-10T11:00:00Z'),
  ('Warehouse 2','TKT-W2-008','Shift handover dispute on inventory delta', 'Day vs night counts disagree by 12.',                  'GENERAL',  'LOW',     'CLOSED',     'Unassigned','Foreman E. Adams','Process clarified at standup',     '2026-05-06T07:00:00Z'),
  ('Warehouse 2','TKT-W2-009','WMS report timing out',                     'Weekly outbound summary 2× longer than baseline.',     'IT',       'HIGH',    'CLOSED',     'James Okafor','Foreman E. Adams','Query plan fixed',                 '2026-05-05T19:00:00Z'),
  ('Warehouse 2','TKT-W2-010','Loading dock door slow to open',            'Slower than usual; intermittent.',                     'EQUIPMENT','LOW',     'RESOLVED',   'Mike Torres','Op P. Nguyen','Hydraulics lubricated',             '2026-05-11T08:30:00Z')

on conflict (instance_name, ticket_number) do update set
  title       = excluded.title,
  description = excluded.description,
  category    = excluded.category,
  severity    = excluded.severity,
  status      = excluded.status,
  assigned_to = excluded.assigned_to,
  reported_by = excluded.reported_by,
  resolution  = excluded.resolution,
  resolved_at = excluded.resolved_at,
  updated_at  = now();
