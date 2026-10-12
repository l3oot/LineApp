# LineApp — Farm Accounting Feature Backlog (P0 / P1 / P2)

> **สถานะ:** Proposed / Ready for refinement · **วันที่:** 2026-10-12 · **ภาษา:** ไทย · **Target:** GitLab Issues

## วัตถุประสงค์

ยกระดับ LineApp จากระบบจดรายรับรายจ่ายไปเป็นบัญชีต้นทุนเกษตรที่รองรับ **พืชไร่, สวนผลไม้, ปศุสัตว์ และประมง** โดยคงความง่ายของการจดรายการผ่าน LINE LIFF และใช้ข้อมูลเดียวกันสร้าง Cash Flow, Production Cost และ Profitability ได้อย่างไม่ซ้ำซ้อน

## หลักฐานโครงสร้างที่ตรวจจาก ZIP

พบไฟล์ `Back/user-service/demo/src/main/java/com/example/demo/controller/{CycleController,TransactionController,CategoryController,CropController,WeatherController,AgriPriceController}.java`, `entity/{CycleEntity,TransactionEntity,CategoryEntity,CropEntity}.java` และหน้า `Front/lineapp/src/pages/{Cycle,CycleDetail,Sum,Analytic,List,Weather,Prices}.tsx` ในไฟล์แนบ `LineApp.zip` ดังนั้น Ticket ด้านล่างเป็น **ข้อเสนอปรับปรุง** ไม่ใช่การยืนยันว่า Feature ปัจจุบันทำงานครบหรือขาดอะไรแน่นอน จำเป็นต้องทำ code review เชิงลึกก่อนลงมือแก้ schema/API

## นิยาม Priority

- **P0 — Must Have:** งานจำเป็นเพื่อให้การคิดต้นทุนเกษตรหลายประเภทและการรายงานเงินถูกต้อง
- **P1 — Should Have:** ลดภาระการใช้งานและเพิ่มความสามารถทางการเงิน
- **P2 — Could Have:** ฟังก์ชันต่อยอดที่ซับซ้อนด้านสต็อก งานประจำ และ Offline

## Backlog Overview

| Priority | Ticket | ชื่อ | Effort | Depends on |
|---|---|---|---|---|
| P0 | `FARM-001` | ปรับ Production Cycle รองรับเกษตรทุกประเภท | สูง | - |
| P0 | `FARM-002` | เพิ่มหน่วยการผลิต (แปลง/บ่อ/คอก/โรงเรือน) | กลาง | FARM-001 |
| P0 | `FIN-001` | แยกยอดเงินคงเหลือออกจากกำไรการผลิต | กลาง | FARM-001 |
| P0 | `FIN-002` | แยกบัญชีครัวเรือนและบัญชีฟาร์ม | กลาง | FIN-001 |
| P0 | `PROD-001` | บันทึกผลผลิตและยอดขายแยกจากรายรับ | สูง | FARM-001, FIN-001 |
| P1 | `FIN-003` | รายการประจำและคัดลอกรายการ | ต่ำ | FIN-002 |
| P1 | `AI-001` | AI ช่วยบันทึกบัญชีด้วยเสียง | สูง | FIN-002 |
| P1 | `FIN-004` | เงินเชื่อและรายการค้างรับค้างจ่าย | สูง | FIN-001, PROD-001 |
| P1 | `RPT-001` | คำนวณราคาคุ้มทุนและต้นทุนต่อหน่วย | กลาง | PROD-001, FIN-001 |
| P2 | `INV-001` | สต็อกวัตถุดิบและการเบิกใช้ | สูง | FARM-001, FIN-001 |
| P2 | `TASK-001` | ปฏิทินงานเกษตรและแจ้งเตือน | กลาง | FARM-001 |
| P2 | `SYNC-001` | Offline-first transaction capture และ sync | สูง | FIN-002 |

> Effort เป็นระดับความซับซ้อนคร่าว ๆ ไม่ใช่ Story Points ที่ประเมินร่วมกับทีมแล้ว

## Definition of Ready (ทุก Ticket)

- [ ] ตรวจ API, DTO, Entity และ behavior ปัจจุบันจาก source code ก่อน implement
- [ ] สรุป UX flow และ business rules พร้อม edge cases
- [ ] ระบุผลกระทบต่อข้อมูลเดิมและ migration / rollback plan
- [ ] ระบุ dependency และ test cases ก่อนเริ่มพัฒนา

## รายละเอียด Ticket

### [P0] FARM-001 — ปรับ Production Cycle รองรับเกษตรทุกประเภท

**Issue Type:** Feature / Enhancement  
**Priority:** P0  
**Effort:** สูง  
**Dependencies:** -  
**Suggested Labels:** `farm-accounting`, `p0`, `feature`

#### Description — ทำอะไร
ทำให้ Cycle รองรับพืชไร่ สวนผลไม้ ปศุสัตว์ และประมง โดยไม่ผูกโมเดลกับ Crop เพียงชนิดเดียว.

#### Business Rationale — ทำไปทำไม
เพื่อใช้แกนต้นทุนเดียวกันกับทุกอาชีพและไม่ต้องสร้างระบบบัญชีซ้ำ.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`CycleController.java, CycleEntity.java, CropEntity.java, Cycle.tsx, CycleDetail.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม activity_type, cycle_type, start_date, end_date(nullable), status; ออกแบบ migration ที่รักษา cycle เดิม.
- **Backend / Business Logic:** ปรับ DTO, validation, service, repository และ mapping ของข้อมูลเดิม; รองรับหลายวันเก็บเกี่ยวผ่าน output records.
- **Frontend / UX:** ปรับแบบฟอร์ม Cycle ให้แสดงคำตามอาชีพและไม่บังคับวันสิ้นสุด.
- **API (proposed, not verified existing route):** `GET/POST/PATCH /api/v1/production-cycles (เสนอ; ตรวจ endpoint เดิมก่อน)`.

#### Acceptance Criteria
- [ ] สร้างรอบปลูกข้าว รุ่นเลี้ยงไก่ รอบเลี้ยงปลา และฤดูทุเรียนได้; cycle เดิมยังอ่านได้; ไม่มีการบังคับวันเก็บเกี่ยวเดียว.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P0] FARM-002 — เพิ่มหน่วยการผลิต (แปลง/บ่อ/คอก/โรงเรือน)

**Issue Type:** Feature / Enhancement  
**Priority:** P0  
**Effort:** กลาง  
**Dependencies:** FARM-001  
**Suggested Labels:** `farm-accounting`, `p0`, `feature`

#### Description — ทำอะไร
สร้าง Production Unit เป็นหน่วยงานทางกายภาพภายในฟาร์ม และเชื่อมกับ Cycle.

#### Business Rationale — ทำไปทำไม
เพื่อแยกต้นทุนและผลผลิตตามพื้นที่หรือหน่วยเลี้ยงได้อย่างถูกต้อง.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`CycleEntity.java, CycleController.java, Cycle.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม production_units(id,farm_id,name,type,area,area_unit,active) และ FK จาก cycles แบบ nullable ระหว่าง migration.
- **Backend / Business Logic:** เพิ่ม CRUD + ownership validation + ป้องกันลบหน่วยที่มีรอบผลิตโดยไม่ตั้งใจ.
- **Frontend / UX:** หน้าเลือกหน่วยผลิตและสร้างหน่วยใหม่อย่างรวดเร็ว.
- **API (proposed, not verified existing route):** `GET/POST/PATCH /api/v1/farms/{farmId}/units`.

#### Acceptance Criteria
- [ ] สร้างนาข้าว A และบ่อปลา B ได้; รอบผลิตผูกหน่วยได้; ข้อมูลผู้ใช้อื่นเข้าถึงไม่ได้.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P0] FIN-001 — แยกยอดเงินคงเหลือออกจากกำไรการผลิต

**Issue Type:** Feature / Enhancement  
**Priority:** P0  
**Effort:** กลาง  
**Dependencies:** FARM-001  
**Suggested Labels:** `farm-accounting`, `p0`, `feature`

#### Description — ทำอะไร
กำหนดสูตร Cash Balance และ Production Profit เป็นคนละ Metric; แยกรายการที่กระทบเงินสดกับต้นทุน.

#### Business Rationale — ทำไปทำไม
เพื่อป้องกันผู้ใช้เข้าใจว่ามีเงินสดเท่ากับกำไร และลดการตัดสินใจผิดจากเงินเชื่อหรือรายการที่ยังไม่รับชำระ.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`TransactionEntity.java, TransactionController.java, Sum.tsx, Analytic.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม affects_cash, transaction_kind, paid_at(nullable) ตามการออกแบบที่ผ่าน review; migration ของข้อมูลเก่าต้องมี default ที่อธิบายได้.
- **Backend / Business Logic:** สร้าง calculation service แยก cash flow และ cycle profitability; ทดสอบกรณี partial payment ในอนาคต.
- **Frontend / UX:** แสดง เงินคงเหลือ, รายรับ-รายจ่าย และกำไรต่อรอบเป็นการ์ดคนละส่วน พร้อม tooltip สูตร.
- **API (proposed, not verified existing route):** `GET /api/v1/reports/cashflow; GET /api/v1/reports/cycles/{id}`.

#### Acceptance Criteria
- [ ] ค่าใช้จ่ายที่ยังไม่จ่ายไม่หักเงินสด; ต้นทุนของรอบยังแสดงได้; ยอดไม่ถูกนับซ้ำ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P0] FIN-002 — แยกบัญชีครัวเรือนและบัญชีฟาร์ม

**Issue Type:** Feature / Enhancement  
**Priority:** P0  
**Effort:** กลาง  
**Dependencies:** FIN-001  
**Suggested Labels:** `farm-accounting`, `p0`, `feature`

#### Description — ทำอะไร
ให้ผู้ใช้กำหนดขอบเขตรายการเป็น FARM หรือ HOUSEHOLD และกรองผลรวมแยกกัน.

#### Business Rationale — ทำไปทำไม
เพื่อให้เห็นต้นทุนการผลิตจริง ไม่รวมค่าใช้จ่ายครอบครัวที่ไม่เกี่ยวข้อง.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`TransactionEntity.java, CategoryEntity.java, List.tsx, Sum.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม ledger_scope หรือ account_scope ใน transactions; ค่าเดิมต้อง migrate อย่างระมัดระวัง.
- **Backend / Business Logic:** เพิ่ม scope filter ใน query, report, create/update; จำกัดสิทธิ์ตามผู้ใช้.
- **Frontend / UX:** ปุ่มสลับ ทั้งหมด/ฟาร์ม/ครัวเรือน และค่าเริ่มต้นที่เข้าใจง่าย.
- **API (proposed, not verified existing route):** `GET/POST /api/v1/transactions?scope=FARM|HOUSEHOLD`.

#### Acceptance Criteria
- [ ] ค่าอาหารครอบครัวไม่เข้าต้นทุนรอบผลิต; กรองบัญชีแล้วผลรวมตรงรายการ; รายการเดิมไม่สูญหาย.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P0] PROD-001 — บันทึกผลผลิตและยอดขายแยกจากรายรับ

**Issue Type:** Feature / Enhancement  
**Priority:** P0  
**Effort:** สูง  
**Dependencies:** FARM-001, FIN-001  
**Suggested Labels:** `farm-accounting`, `p0`, `feature`

#### Description — ทำอะไร
บันทึกผลผลิตจริงที่เก็บเกี่ยวหรือผลิตได้ และรายการขายแบบจำนวน x ราคาต่อหน่วย; สร้างรายการรับเงินโดยไม่ซ้ำ.

#### Business Rationale — ทำไปทำไม
เพื่อให้ทราบผลผลิตคงเหลือ ต้นทุนต่อหน่วย และแยกวันที่ผลิตกับวันที่ขาย.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`CycleDetail.tsx, TransactionController.java, CycleController.java`

#### Scope of Work
- **Database / Migration:** เพิ่ม production_outputs, sales, sale_payments หรือ transaction link ตามขอบเขต MVP; เก็บ quantity เป็น DECIMAL และ unit code.
- **Backend / Business Logic:** สร้าง service สำหรับ output, sales, linkage กับ transactions, idempotency และ transactional consistency.
- **Frontend / UX:** หน้าบันทึกผลผลิตและขายผลผลิตจากหน้า CycleDetail พร้อมยอดคงเหลือ.
- **API (proposed, not verified existing route):** `POST /api/v1/production-outputs; POST /api/v1/sales; GET /api/v1/cycles/{id}/outputs`.

#### Acceptance Criteria
- [ ] เก็บเกี่ยว 4000 กก. ขาย 2500 กก. เหลือ 1500 กก.; แก้ไขยอดขายแล้วไม่สร้างรายรับซ้ำ; จำนวนขายเกินคงเหลือถูกปฏิเสธหรือเตือนตามกฎ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P1] FIN-003 — รายการประจำและคัดลอกรายการ

**Issue Type:** Feature / Enhancement  
**Priority:** P1  
**Effort:** ต่ำ  
**Dependencies:** FIN-002  
**Suggested Labels:** `farm-accounting`, `p1`, `feature`

#### Description — ทำอะไร
ให้ทำซ้ำรายการเดิมแบบกดครั้งเดียวและตั้ง template รายจ่ายที่เกิดบ่อย.

#### Business Rationale — ทำไปทำไม
เพื่อลดเวลาจดบัญชีสำหรับค่าอาหารสัตว์ ค่าแรง หรือค่าเช่าที่เกิดซ้ำ.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`List.tsx, TransactionController.java`

#### Scope of Work
- **Database / Migration:** เพิ่ม transaction_templates; ไม่สร้างรายการจริงอัตโนมัติโดยไม่กำหนดกติกา.
- **Backend / Business Logic:** สร้าง duplicate endpoint หรือใช้ create จาก template; validate ป้องกันการกดซ้ำ.
- **Frontend / UX:** ปุ่ม จดซ้ำ และรายการโปรด.
- **API (proposed, not verified existing route):** `POST /api/v1/transaction-templates; POST /api/v1/transactions/from-template`.

#### Acceptance Criteria
- [ ] คัดลอกแล้วผู้ใช้แก้วันที่/จำนวนเงินได้; กดซ้ำไม่เกิดรายการซ้ำโดยไม่ตั้งใจ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P1] AI-001 — AI ช่วยบันทึกบัญชีด้วยเสียง

**Issue Type:** Feature / Enhancement  
**Priority:** P1  
**Effort:** สูง  
**Dependencies:** FIN-002  
**Suggested Labels:** `farm-accounting`, `p1`, `feature`

#### Description — ทำอะไร
รับเสียงภาษาไทย แปลงเป็นข้อความและดึงจำนวนเงิน หมวดหมู่ วันที่ และรอบผลิต แล้วให้ผู้ใช้ยืนยัน.

#### Business Rationale — ทำไปทำไม
เพื่อช่วยผู้ใช้ที่พิมพ์ไม่คล่องและลดขั้นตอนกรอกข้อมูล.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`Transaction form, existing AI integration (verify actual integration before implementation)`

#### Scope of Work
- **Database / Migration:** เก็บเฉพาะ metadata ที่จำเป็นและกำหนด retention ของไฟล์เสียง; ไม่เก็บข้อมูลอ่อนไหวเกินจำเป็น.
- **Backend / Business Logic:** speech-to-text adapter + structured extraction + schema validation; ห้าม AI เขียน transaction ตรงโดยไม่ยืนยัน.
- **Frontend / UX:** ปุ่มไมค์, preview ที่แก้ไขได้, ปุ่มยืนยันบันทึก.
- **API (proposed, not verified existing route):** `POST /api/v1/ai/transactions/parse (draft only)`.

#### Acceptance Criteria
- [ ] พูด ซื้อปุ๋ย 1200 เมื่อวาน แล้วได้ draft; ถ้าฟังผิดแก้ได้; ไม่มีการบันทึกโดยอัตโนมัติ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P1] FIN-004 — เงินเชื่อและรายการค้างรับค้างจ่าย

**Issue Type:** Feature / Enhancement  
**Priority:** P1  
**Effort:** สูง  
**Dependencies:** FIN-001, PROD-001  
**Suggested Labels:** `farm-accounting`, `p1`, `feature`

#### Description — ทำอะไร
บันทึกยอดขายที่ยังไม่รับเงินและรายจ่ายที่ยังไม่ชำระ รวมถึงการชำระบางส่วน.

#### Business Rationale — ทำไปทำไม
เพื่อให้เกษตรกรรู้สถานะลูกหนี้เจ้าหนี้และเงินสดที่คาดว่าจะเข้าออก.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`TransactionEntity.java, Sum.tsx, CycleDetail.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม receivables/payables หรือ obligations + payment allocations; รองรับ partial payments.
- **Backend / Business Logic:** สร้าง state machine UNPAID/PARTIAL/PAID และ reconciliation ไม่ให้จ่ายเกิน.
- **Frontend / UX:** หน้า ค้างรับ/ค้างจ่าย พร้อมวันครบกำหนดและบันทึกชำระ.
- **API (proposed, not verified existing route):** `POST /api/v1/obligations; POST /api/v1/obligations/{id}/payments`.

#### Acceptance Criteria
- [ ] ขาย 10000 รับแล้ว 4000 ต้องแสดงค้างรับ 6000; เงินสดเพิ่ม 4000; กำไรไม่ถูกนับซ้ำ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P1] RPT-001 — คำนวณราคาคุ้มทุนและต้นทุนต่อหน่วย

**Issue Type:** Feature / Enhancement  
**Priority:** P1  
**Effort:** กลาง  
**Dependencies:** PROD-001, FIN-001  
**Suggested Labels:** `farm-accounting`, `p1`, `feature`

#### Description — ทำอะไร
แสดง total production cost / output quantity และ break-even unit price พร้อมสถานะความครบถ้วนของข้อมูล.

#### Business Rationale — ทำไปทำไม
เพื่อช่วยตั้งราคาขายและเปรียบเทียบต้นทุนระหว่างรอบผลิต.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`Analytic.tsx, CycleDetail.tsx, CycleEntity.java`

#### Scope of Work
- **Database / Migration:** ใช้ cost aggregation จาก transactions และ output records; ไม่จำเป็นต้องเพิ่มตารางถาวรใน MVP.
- **Backend / Business Logic:** report service รองรับ zero quantity, unit normalization และต้นทุนที่ไม่จัดสรร.
- **Frontend / UX:** การ์ดต้นทุนต่อ กก./ตัว/ไร่ และคำเตือนเมื่อข้อมูลไม่ครบ.
- **API (proposed, not verified existing route):** `GET /api/v1/reports/cycles/{id}/break-even`.

#### Acceptance Criteria
- [ ] ต้นทุน 25000 ผลผลิต 4000 กก. แสดง 6.25 บาท/กก.; ผลผลิต 0 แสดง N/A ไม่หารศูนย์.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P2] INV-001 — สต็อกวัตถุดิบและการเบิกใช้

**Issue Type:** Feature / Enhancement  
**Priority:** P2  
**Effort:** สูง  
**Dependencies:** FARM-001, FIN-001  
**Suggested Labels:** `farm-accounting`, `p2`, `feature`

#### Description — ทำอะไร
ติดตามการซื้อ รับเข้า เบิกใช้ และยอดคงเหลือของปุ๋ย อาหารสัตว์ ยา และเมล็ดพันธุ์.

#### Business Rationale — ทำไปทำไม
เพื่อไม่ให้ต้นทุนการซื้อทั้งล็อตถูกนับเป็นต้นทุนของรอบเดียว และช่วยวางแผนซื้อ.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`CategoryEntity.java, TransactionEntity.java, CycleDetail.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม inventory_items, inventory_movements, unit conversions; กำหนด cost method เช่น weighted average ก่อนพัฒนา.
- **Backend / Business Logic:** atomic stock movements, no-negative-stock policy และเชื่อมเบิกใช้กับ cycle cost.
- **Frontend / UX:** หน้าสต็อก รับเข้า เบิกใช้ และยอดคงเหลือ.
- **API (proposed, not verified existing route):** `POST /api/v1/inventory/receipts; POST /api/v1/inventory/issues; GET /api/v1/inventory`.

#### Acceptance Criteria
- [ ] ซื้อปุ๋ย 10 ถุง เบิก 3 ถุงเหลือ 7; ต้นทุนรอบสะท้อนเฉพาะที่เบิก; ไม่หักค่าใช้จ่ายซ้ำ.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P2] TASK-001 — ปฏิทินงานเกษตรและแจ้งเตือน

**Issue Type:** Feature / Enhancement  
**Priority:** P2  
**Effort:** กลาง  
**Dependencies:** FARM-001  
**Suggested Labels:** `farm-accounting`, `p2`, `feature`

#### Description — ทำอะไร
บันทึกกำหนดงานตามรอบผลิต เช่น ใส่ปุ๋ย ให้อาหาร เก็บเกี่ยว และแจ้งเตือนก่อนครบกำหนด.

#### Business Rationale — ทำไปทำไม
เพื่อช่วยเกษตรกรติดตามกิจกรรมที่สัมพันธ์กับต้นทุนและผลผลิต.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`CycleDetail.tsx, Weather.tsx`

#### Scope of Work
- **Database / Migration:** เพิ่ม farm_tasks, reminders, completion_status; timezone Asia/Bangkok.
- **Backend / Business Logic:** scheduler/notification adapter พร้อม retry และ opt-in.
- **Frontend / UX:** ปฏิทินรายการงาน ปุ่มทำเสร็จ และตั้งเตือน.
- **API (proposed, not verified existing route):** `GET/POST/PATCH /api/v1/farm-tasks`.

#### Acceptance Criteria
- [ ] สร้างงานวันพรุ่งนี้ได้; กดเสร็จแล้วไม่แจ้งซ้ำ; ปิดการแจ้งเตือนได้.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

### [P2] SYNC-001 — Offline-first transaction capture และ sync

**Issue Type:** Feature / Enhancement  
**Priority:** P2  
**Effort:** สูง  
**Dependencies:** FIN-002  
**Suggested Labels:** `farm-accounting`, `p2`, `feature`

#### Description — ทำอะไร
ให้จดรายรับรายจ่ายได้ขณะไม่มีสัญญาณ และซิงก์เมื่อออนไลน์ โดยเฉพาะเมื่อใช้ผ่าน LINE LIFF.

#### Business Rationale — ทำไปทำไม
เพื่อให้ใช้งานในไร่นาหรือพื้นที่สัญญาณไม่เสถียรได้จริง.

#### Existing Code Touchpoints (ตรวจสอบก่อนแก้)
`Front/lineapp, TransactionController.java`

#### Scope of Work
- **Database / Migration:** client local queue (IndexedDB) + client_generated_id, server idempotency key และ sync metadata.
- **Backend / Business Logic:** batch sync endpoint, conflict handling, retry, ownership check; ห้ามส่งรายการซ้ำ.
- **Frontend / UX:** สถานะ ยังไม่ซิงก์/ซิงก์แล้ว/มีข้อขัดแย้ง และปุ่มลองใหม่.
- **API (proposed, not verified existing route):** `POST /api/v1/sync/transactions`.

#### Acceptance Criteria
- [ ] ปิดเน็ตบันทึกได้; เปิดเน็ตแล้ว sync ครั้งเดียว; refresh/retry ไม่สร้างซ้ำ; ทดสอบข้อจำกัด LIFF จริง.
- [ ] ตรวจสอบสิทธิ์ผู้ใช้และ ownership ของทุก resource ที่เกี่ยวข้อง
- [ ] มี unit/integration tests สำหรับ business rules และกรณีผิดพลาด
- [ ] ข้อมูลเก่ายังคงใช้งานได้หรือมีแผน migration/rollback ที่ทดสอบแล้ว
- [ ] รองรับ UI ภาษาไทยและแสดง error ที่ผู้ใช้เข้าใจได้

#### Out of Scope / Notes
- ไม่รวมการปรับโครงสร้างทั้งระบบโดยไม่มีเหตุผลทางธุรกิจ
- API paths และ schema เป็น **ข้อเสนอ** ต้อง reconcile กับ implementation จริงก่อนสร้าง issue ย่อย

---

## Cross-cutting / Enabler Tickets (งานรองรับที่ควรสร้างแยก)

### [P0] TECH-001 — Audit Data Model, API & Migration
**Description:** ตรวจสอบ Cycle, Crop, Transaction, Category และ reports ปัจจุบัน รวมถึง schema, endpoint, permission และการคำนวณเงินจริง พร้อมจัดทำ mapping old→new.  
**Why:** ลดความเสี่ยงข้อมูลสูญหาย, migration พัง, หรือสร้าง endpoint ซ้ำ.  
**Acceptance Criteria:** มี ERD ก่อน/หลัง, endpoint inventory, migration strategy และ regression checklist.

### [P0] TECH-002 — Accounting Invariants & Automated Tests
**Description:** นิยาม invariant ของเงินสด, ต้นทุน, ยอดขาย, การชำระเงิน, รายการยกเลิก และการปัดเศษ พร้อม test fixtures.  
**Why:** ความผิดพลาดด้านบัญชีทำให้ผู้ใช้ไม่เชื่อถือแอป แม้ UI ใช้งานง่าย.  
**Acceptance Criteria:** มี test สำหรับ double counting, decimal precision, authorization, duplicate requests และ zero quantity.

### [P1] UX-001 — Accessibility & Low-tech Farmer Usability
**Description:** ทดสอบการจดรายการกับเกษตรกรหลายกลุ่ม; ปุ่มใหญ่, ข้อความสั้น, ค่าเริ่มต้น, ปุ่มจดซ้ำ, ลดขั้นตอน.  
**Why:** ความถี่ในการจดข้อมูลเป็นตัวกำหนดคุณภาพรายงานมากกว่าความซับซ้อนของกราฟ.  
**Acceptance Criteria:** ผู้ใช้ใหม่จดรายการแรกได้โดยไม่ต้องสร้าง Cycle; มี usability test และบันทึกปัญหาจริง.

### [P2] OPS-001 — Backup, Export & Recovery
**Description:** วางนโยบายสำรองข้อมูล, export รายการ, recovery และ audit trail ของการแก้ไข.  
**Why:** บัญชีเกษตรเป็นข้อมูลสำคัญที่ไม่ควรสูญหายจากความผิดพลาดของเครื่องหรือระบบ.  
**Acceptance Criteria:** ทดสอบ restore ได้; export รายการและยอดรวมตรงกับฐานข้อมูล; กำหนด retention.

## ลำดับพัฒนาที่แนะนำ

1. `TECH-001` → `TECH-002` เพื่อยืนยัน behavior และความถูกต้องของบัญชี
2. `FARM-001` → `FARM-002` เพื่อสร้างโครงสร้างหน่วยและรอบผลิต
3. `FIN-001` + `FIN-002` เพื่อทำ Cash/Profit และแยกครัวเรือน
4. `PROD-001` เพื่อบันทึกผลผลิตและยอดขาย
5. `FIN-003`, `RPT-001`, `FIN-004`, `AI-001` ตาม dependency และผลทดสอบ UX
6. `INV-001`, `TASK-001`, `SYNC-001` เมื่อ Core Accounting เสถียร

## Release Gates

- **P0 Exit:** เกษตรกร 4 ประเภทสร้างรอบผลิตและบันทึกต้นทุน/ผลผลิต/ยอดขายได้; Cash Balance ไม่ปะปนกับ Profit; ไม่มี double counting; ทดสอบ ownership ผ่าน
- **P1 Exit:** จดซ้ำ/บันทึกด้วยเสียงแบบยืนยันก่อน save, ติดตามหนี้ และดูราคาคุ้มทุนได้โดยผลคำนวณสอดคล้องกัน
- **P2 Exit:** สต็อกไม่ติดลบโดยไม่ตั้งใจ, งานเตือนถูกต้อง และ Offline Sync ไม่สร้างรายการซ้ำ

## GitLab Issue Template (copy/paste)

```markdown
## Description
[ฟังก์ชันนี้ต้องทำอะไร]

## Why / Business Value
[ทำไมจึงต้องมีฟังก์ชันนี้]

## Scope
- Frontend:
- Backend:
- Database:
- API:

## Acceptance Criteria
- [ ] ...

## Dependencies
- ...

## Definition of Done
- [ ] Code review
- [ ] Tests pass
- [ ] Migration verified
- [ ] Documentation updated
```

## Definition of Done (ใช้ร่วมกันทุก Ticket)

- [ ] PR ผ่าน Code Review และ CI
- [ ] Unit / Integration Tests ผ่าน
- [ ] API documentation และตัวอย่าง request/response อัปเดต
- [ ] Validation, error response และ authorization ครบ
- [ ] DB migration และ rollback/backup ผ่านการตรวจ
- [ ] ทดสอบ UX บนมือถือและ LINE LIFF (เมื่อเกี่ยวข้อง)
- [ ] QA ทดสอบ Acceptance Criteria ผ่าน
