# 🤖 Robot Framework QA Center

ชุดทดสอบอัตโนมัติของระบบ (API tests) เขียนด้วย Robot Framework + RequestsLibrary

## ติดตั้ง
```
pip install -r requirements.txt
```

## วิธีรัน
1. รัน backend และ seed ข้อมูลตัวอย่าง (`npm run seed`) ให้เรียบร้อย
2. รันทดสอบ:
   - Linux/macOS: `./run_tests.sh`
   - Windows: `run_tests.bat`
   - หรือกดปุ่ม **Run tests** ในหน้า QA Center (เข้าสู่ระบบด้วยบัญชี `admin001` — เฉพาะผู้ดูแลระบบ)

ผลลัพธ์จะถูกเขียนไว้ที่ `results/output.xml`, `log.html`, `report.html`
และหน้า QA Center จะอ่าน `output.xml` มาแสดง PASS/FAIL อัตโนมัติ

## โครงสร้าง
- `tests/01_auth.robot` — เข้าสู่ระบบ
- `tests/02_intelligence.robot` — Progress/Risk/Twin/Recommendation/Report/Mentor/What-if/Anomaly
- `tests/03_security.robot` — สิทธิ์การเข้าถึง (401/403)
- `resources/common.resource` — keywords และตัวแปรกลาง (BASE_URL, บัญชีทดสอบ)
