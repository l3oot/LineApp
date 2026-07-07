# LineApp

แอป LINE LIFF สำหรับจดบันทึกรายรับ-รายจ่ายของเกษตรกร พร้อมระบบ AI ช่วยแยกข้อมูลจากข้อความปกติของผู้ใช้

## โครงสร้างโปรเจค

```
LineApp/
├── docker-compose.yml          # รวมทั้ง stack
├── .env.example                # ตัวอย่าง env (Postgres / Docs / CORS / Vite)
├── Front/
│   └── lineapp/                # React + Vite + Tailwind
└── Back/
    ├── user-service/demo/      # Spring Boot — CRUD + LINE Auth + JWT
    └── ai-service/             # FastAPI — LLM extract transaction
```

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind + react-aria-components + Chart.js
- **User Service**: Spring Boot 4 + Spring Security + JPA + PostgreSQL + JWT
- **AI Service**: FastAPI + Pydantic + Typhoon/OpenTyphoon LLM
- **Database**: PostgreSQL (รันบนเครื่อง host)
- **Deploy**: Docker Compose

## วิธีรัน (Docker)

```powershell
# 1. คัดลอก env ตัวอย่าง แล้วแก้ค่าตามเครื่อง
Copy-Item .env.example .env

# 2. รันทั้ง stack
docker compose up -d --build
```

หลังขึ้น:
- Frontend: <http://localhost:5173>
- User Service API: <http://localhost:8080>
- Swagger UI (HTTP Basic): <http://localhost:8080/api/docs> (default `admin` / `admin`)
- AI Service: <http://localhost:8000>

## วิธีรันแบบ dev บน host

### Frontend
```powershell
cd Front/lineapp
npm install
npm run dev
```

### User Service
```powershell
cd Back/user-service/demo
./mvnw spring-boot:run
```

### AI Service
```powershell
cd Back/ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

## Env ที่ต้องตั้ง

ใช้ root `.env` ไฟล์เดียวสำหรับทั้ง stack แล้วให้ Docker Compose inject ค่าเข้าแต่ละ container:

- `root .env` — `VITE_*`, `POSTGRES_*`, `LINE_*`, `AI_*`, `HCODE_*`, `DOCS_*`, `SPRING_DEVTOOLS_*`, `SERVER_*`, `PYTHONUNBUFFERED`, `LINEAPP_API_BASE`, `WATCHFILES_FORCE_POLLING`

ไฟล์ `.env` แยกของแต่ละ service ถูกยกเลิกแล้ว เพื่อให้ source of truth อยู่ที่ root `.env` ตัวเดียว

## License

Private
