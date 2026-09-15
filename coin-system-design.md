# ระบบ Coin / Point สำหรับสะสมคะแนน

## 1. แนวคิดหลัก

ระบบ Coin ควรแยกข้อมูลออกเป็น 3 ส่วนหลัก

```text
coin_rule
    │
    │ กำหนดว่า "กิจกรรมอะไรได้ Coin เท่าไร"
    ▼
coin_transaction
    │
    │ บันทึกว่า "User ได้/ใช้ Coin จริงจากอะไร"
    ▼
coin_wallet
    │
    └── balance = ยอด Coin ปัจจุบัน
```

แนวคิดนี้สอดคล้องกับระบบ Loyalty ทั่วไปที่มีการกำหนด rules สำหรับการให้/ใช้คะแนน และมี balance กับ transaction logs แยกกัน เช่น Talon.One ระบุว่าสามารถกำหนด rules เพื่อเลือกว่าการกระทำใดได้รับ points และสามารถใช้ points แลก rewards ได้ [1][2]

---

## 2. ตาราง `coin_rule`

ใช้เก็บ **กฎของกิจกรรมที่ทำแล้วได้รับ Coin**

ตัวอย่าง:

```text
coin_rule
------------------------------
id
code
name
description
coin_amount
daily_limit
total_limit
active
created_at
updated_at
```

ตัวอย่างข้อมูล:

| id | code | name | coin_amount | daily_limit | active |
|---:|---|---|---:|---:|---|
| 1 | REGISTER | สมัครสมาชิก | 100 | 1 | true |
| 2 | RECORD | บันทึกรายการ | 1 | 20 | true |
| 3 | INVITE | เชิญเพื่อน | 100 | 10 | true |
| 4 | PROFILE | กรอกข้อมูล | 20 | 1 | true |

### หน้าที่ของแต่ละคอลัมน์

- `id` — Primary Key
- `code` — รหัสกิจกรรมที่ Backend ใช้อ้างอิง
- `name` — ชื่อที่แสดงในระบบ
- `description` — รายละเอียดของกิจกรรม
- `coin_amount` — จำนวน Coin ที่ได้รับ
- `daily_limit` — จำกัดจำนวนครั้ง/จำนวน Coin ต่อวัน
- `total_limit` — จำกัดจำนวนรวมตามที่ออกแบบระบบ
- `active` — เปิด/ปิดกิจกรรม
- `created_at` / `updated_at` — วันเวลาสร้าง/แก้ไข

> หมายเหตุ: `daily_limit` และ `total_limit` เป็นตัวอย่างการออกแบบของระบบเรา ไม่ใช่ข้อกำหนดตายตัวของระบบ Loyalty ทุกระบบ

---

## 3. `code` สามารถ Map กับ Enum ได้

ถ้าเป็นกิจกรรมที่ระบบกำหนดไว้ล่วงหน้า สามารถใช้ Enum ใน Java ได้

```java
public enum CoinRuleCode {
    REGISTER,
    RECORD,
    INVITE,
    PROFILE,
    DAILY_LOGIN
}
```

แล้ว Entity:

```java
@Enumerated(EnumType.STRING)
@Column(unique = true, nullable = false)
private CoinRuleCode code;
```

Database:

```text
REGISTER
RECORD
INVITE
PROFILE
```

### หน้าที่ของ Enum

Enum ใช้บอกว่า **กิจกรรมประเภทอะไร**

ส่วนจำนวน Coin และ limit ให้ Database เป็นคนกำหนด

```text
Java Enum                  Database
────────────               ─────────────
RECORD          ────────>  RECORD
                            coin_amount = 1
                            daily_limit = 20
```

ดังนั้นถ้าเปลี่ยนจาก 1 Coin เป็น 2 Coin สามารถแก้ใน DB ได้โดยไม่ต้องเปลี่ยน Enum

```sql
UPDATE coin_rule
SET coin_amount = 2
WHERE code = 'RECORD';
```

แนะนำให้ `code` เป็น `UNIQUE`

```sql
code VARCHAR(50) NOT NULL UNIQUE
```

---

## 4. ตาราง `coin_transaction`

ตารางนี้เก็บ **ประวัติการเปลี่ยนแปลง Coin ที่เกิดขึ้นจริง**

ตัวอย่าง:

```text
coin_transaction
------------------------------
id
user_id
coin_rule_id
amount
type
reference_type
reference_id
description
created_at
expired_at
```

ตัวอย่างข้อมูล:

| id | user_id | rule | amount | type | reference |
|---:|---:|---|---:|---|---|
| 1 | 101 | REGISTER | +100 | EARN | user:101 |
| 2 | 101 | RECORD | +1 | EARN | transaction:555 |
| 3 | 101 | RECORD | +1 | EARN | transaction:556 |
| 4 | 101 | INVITE | +100 | EARN | invite:888 |
| 5 | 101 | NULL | -200 | SPEND | reward:123 |

แนวคิดนี้สอดคล้องกับระบบ Loyalty ที่เก็บข้อมูลของ point transaction เช่น จำนวน points, เหตุผล, เวลา, start/expiry date และ transaction ID [3]

---

## 5. ตาราง `coin_wallet`

ใช้เก็บยอด Coin ปัจจุบันของ User

```text
coin_wallet
----------------
id
user_id
balance
updated_at
```

ตัวอย่าง:

```text
user_id = 101
balance = 250
```

`coin_wallet.balance` เหมาะสำหรับการอ่านยอดปัจจุบันอย่างรวดเร็ว ส่วน `coin_transaction` ใช้เป็นประวัติการเคลื่อนไหว

---

## 6. Flow การได้ Coin

ตัวอย่าง User บันทึกรายการรายจ่าย

```text
User
 ↓
บันทึกรายการสำเร็จ
 ↓
Backend ตรวจว่า Event นี้คือ RECORD
 ↓
หา coin_rule ที่ code = RECORD
 ↓
ตรวจ daily_limit
 ↓
ผ่าน
 ↓
สร้าง coin_transaction +1
 ↓
เพิ่ม coin_wallet.balance
```

ตัวอย่าง:

```text
coin_rule

RECORD
coin_amount = 1
daily_limit = 20
```

User บันทึก 3 รายการ:

```text
09:00  +1
10:00  +1
11:30  +1
--------------
วันนี้ +3
```

---

## 7. ไม่ควรให้ Frontend กำหนดจำนวน Coin

ไม่ควรให้ Frontend ส่งแบบนี้:

```json
{
  "coin": 100
}
```

เพราะ Backend ไม่ควรเชื่อจำนวน Coin ที่ Client ส่งมา

ควรให้ Backend เป็นผู้ตัดสิน:

```text
กิจกรรม = RECORD
        ↓
coin_rule
        ↓
coin_amount = 1
```

ดังนั้น Frontend เพียงทำกิจกรรม ส่วน Backend ตรวจสอบและสร้าง Coin transaction

---

## 8. ทำไมต้องแยก `coin_rule` กับ `coin_transaction`

เพราะสองตารางมีหน้าที่ต่างกัน

### `coin_rule`

ตอบคำถาม:

> กิจกรรมนี้ให้ Coin เท่าไร?

```text
RECORD → 1 Coin
INVITE → 100 Coin
```

### `coin_transaction`

ตอบคำถาม:

> User คนนี้ได้รับ Coin จากกิจกรรมอะไร เมื่อไร?

```text
User 101
+1 RECORD
+1 RECORD
+100 INVITE
```

### `coin_wallet`

ตอบคำถาม:

> ตอนนี้ User มี Coin เท่าไร?

```text
250 Coin
```

---

## 9. การป้องกันการได้ Coin ซ้ำ

ควรมี `reference_type` และ `reference_id`

ตัวอย่าง:

```text
reference_type = INVITATION
reference_id   = 888
```

เมื่อระบบพยายามให้ Coin จาก invitation เดิมอีกครั้ง Backend สามารถตรวจสอบได้ว่า event นี้เคยถูกใช้สร้าง Coin แล้วหรือไม่

ตัวอย่าง:

```text
INVITATION 888
       ↓
เคยสร้าง coin_transaction แล้ว?
       ↓
   ใช่ → ไม่ให้ซ้ำ
   ไม่ใช่ → ให้ Coin
```

สำหรับกิจกรรมที่ต้องได้ Coin เพียงครั้งเดียว สามารถใช้ unique constraint/idempotency strategy ตามรูปแบบของกิจกรรมนั้น

---

## 10. การหมดอายุของ Coin

ถ้าระบบต้องการให้ Coin หมดอายุ สามารถเก็บ:

```text
expired_at
```

ใน transaction หรือออกแบบเป็น point batches/ledger entries แยกตามอายุ

ตัวอย่าง:

```text
ได้รับ 100 Coin
วันที่ 1 ม.ค.
หมดอายุ 31 ธ.ค.
```

ระบบ Loyalty จริงรองรับ start/expiry ของ points และเก็บ expiry information ใน transaction data [3][4]

---

## 11. การใช้ Coin แลกรางวัล

สามารถมีตารางเพิ่ม:

```text
coin_reward
------------------------------
id
name
description
coin_required
stock
active
created_at
updated_at
```

เช่น:

| id | name | coin_required | stock |
|---:|---|---:|---:|
| 1 | ส่วนลด 20 บาท | 200 | 100 |
| 2 | ส่วนลด 50 บาท | 500 | 50 |

เมื่อ User แลก:

```text
coin_wallet
1000 Coin
    ↓
แลก Reward 500 Coin
    ↓
coin_transaction
-500 SPEND
    ↓
coin_wallet
500 Coin
```

ระบบ Loyalty เช่น Talon.One ก็รองรับการกำหนด points required สำหรับ reward และบันทึกการหัก points เป็น loyalty transaction [5]

---

## 12. โครงสร้างที่แนะนำสำหรับระบบเริ่มต้น

สำหรับระบบขนาดเล็กถึงกลาง ไม่จำเป็นต้องทำ Loyalty Engine ใหญ่ตั้งแต่แรก

แนะนำ:

```text
users
  │
  ├───────────────┐
  │               │
  ▼               ▼
coin_wallet    coin_transaction
                    │
                    ▼
                 coin_rule

coin_reward
```

### ตารางหลัก

```text
coin_rule
coin_wallet
coin_transaction
coin_reward
```

### Enum หลัก

```java
public enum CoinRuleCode {
    REGISTER,
    RECORD,
    INVITE,
    PROFILE,
    DAILY_LOGIN
}
```

และ:

```java
public enum CoinTransactionType {
    EARN,
    SPEND,
    EXPIRE,
    ADJUST
}
```

---

## 13. ตัวอย่าง Flow สำหรับระบบยายเภา

```text
ผู้ใช้สมัครสมาชิก
        ↓
REGISTER
        ↓
coin_rule
100 Coin
        ↓
coin_transaction
+100
        ↓
wallet = 100


ผู้ใช้บันทึกรายรับ
        ↓
RECORD
        ↓
coin_rule
1 Coin
        ↓
ตรวจ daily_limit
        ↓
coin_transaction
+1
        ↓
wallet = 101


ผู้ใช้เชิญเพื่อน
        ↓
INVITE
        ↓
ตรวจว่า invitation สำเร็จจริง
        ↓
coin_transaction
+100
        ↓
wallet = 201
```

---

## 14. สรุป

```text
┌────────────────────────────┐
│        coin_rule           │
│ "กิจกรรมนี้ได้กี่ Coin?"   │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    coin_transaction        │
│ "เกิด Coin จริงเมื่อไร?"   │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│       coin_wallet          │
│ "ตอนนี้มี Coin เท่าไร?"    │
└────────────────────────────┘
```

หลักการสำคัญ:

1. `coin_rule` = Configuration ของกิจกรรม
2. `code` = Identifier ของกิจกรรม และสามารถ Map กับ Java Enum
3. `coin_amount` ควรอยู่ใน DB ถ้าต้องการให้เปลี่ยนค่าผ่าน Configuration ได้
4. `coin_transaction` = ประวัติการได้/ใช้ Coin
5. `coin_wallet` = ยอด Coin ปัจจุบัน
6. Backend ต้องเป็นผู้ตัดสินจำนวน Coin ไม่ควรเชื่อค่าจาก Frontend
7. ใช้ `reference_id` เพื่อช่วยป้องกันการให้ Coin ซ้ำจาก Event เดิม
8. หากมี expiry ให้เก็บข้อมูลวันเริ่มใช้/หมดอายุของ points ตามรูปแบบที่ออกแบบ

---

## แหล่งข้อมูล

[1] Talon.One — Loyalty programs  
https://docs.talon.one/docs/product/loyalty-programs/overview

[2] Talon.One — Create a point-based loyalty campaign  
https://docs.talon.one/docs/product/tutorials/loyalty/loyalty-points-program

[3] Talon.One — Card-based loyalty programs / Point transactions  
https://docs.talon.one/docs/product/loyalty-programs/card-based/card-based-overview

[4] Talon.One — Manage loyalty programs / Points settings  
https://docs.talon.one/docs/product/loyalty-programs/manage-loyalty-programs

[5] Talon.One — Rewards  
https://docs.talon.one/docs/product/rewards/overview

[6] Talon.One — Subledgers  
https://docs.talon.one/docs/product/loyalty-programs/use-subledgers

> หมายเหตุ: โครงสร้างตารางและ Java Enum ในเอกสารนี้เป็นข้อเสนอสำหรับการออกแบบระบบของเรา ไม่ใช่ schema ที่ Talon.One กำหนดให้ใช้โดยตรง
