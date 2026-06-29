# DC Accept Check

Web App สำหรับตรวจสอบเกณฑ์การรับสินค้า โดยใช้ไฟล์ Excel เป็นฐานข้อมูล และให้ผู้ใช้งานกรอกวันผลิตเพื่อคำนวณผล **Yes/No**

## สิ่งที่ปรับในเวอร์ชันนี้

- ใช้ชุดข้อมูล Excel ใหม่ใน `data/database.xlsx`
- ลบส่วนโหลดไฟล์ Excel อื่น / ใช้งานแบบ Local
- Date field ใช้รูปแบบ `dd/mm/yyyy` พร้อม placeholder `วัน/เดือน/ปี`
- เปลี่ยน label จาก `วันที่ตรวจรับ / วันที่ปัจจุบัน` เป็น `วันที่ส่งของ`
- ตั้งค่า `วันที่ส่งของ` default เป็นวันที่ปัจจุบัน
- จัด filter part และ result part เป็นแนวตั้ง เหมาะกับการใช้งานบนมือถือ
- ลบ Card สรุปตัวเลข
- ลบปุ่ม Download CSV
- เพิ่มรูปรถขนส่งใน header ด้านขวา
- ตารางผลลัพธ์แสดงเฉพาะ column ตามที่กำหนด:
  1. ส่ง?
  2. ห้าง
  3. สินค้า
  4. อายุสินค้า
  5. วันผลิต
  6. เกณฑ์รับสินค้า (วัน)
  7. วันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับ
  8. วันที่ส่งของ

## โครงสร้างไฟล์

```text
DC-Accept-Check/
├── index.html
├── style.css
├── app.js
├── README.md
├── assets/
│   └── delivery-truck.png
└── data/
    └── database.xlsx
```

## Logic การคำนวณ

ระบบอ่านค่าจาก Excel:

- ห้าง
- สินค้า
- อายุสินค้า
- เกณฑ์รับสินค้า (วัน)

จากนั้นคำนวณ:

```text
วันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับ = วันผลิต + เกณฑ์รับสินค้า (วัน)
ส่ง? = ถ้า วันที่ส่งของ < วันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับ ให้แสดง Yes ไม่เช่นนั้นแสดง No
```

ค่า `Yes` แสดงเป็นแถบสีเขียว และค่า `No` แสดงเป็นแถบสีแดง

## วิธี Run บนเครื่อง

เปิด Terminal / Command Prompt ที่ folder project แล้วรัน:

```bash
python -m http.server 8000
```

จากนั้นเปิด browser:

```text
http://localhost:8000
```

## วิธี Upload ทับ Project เดิมบน GitHub

1. แตกไฟล์ ZIP
2. เข้า repository เดิมใน GitHub
3. กด **Add file > Upload files**
4. ลากไฟล์และ folder ทั้งหมดนี้ขึ้นไปที่ root ของ repository:

```text
index.html
style.css
app.js
README.md
assets/
data/
```

5. กด **Commit changes**
6. รอ GitHub Pages deploy ใหม่ แล้วเปิด URL เดิมอีกครั้ง

> สำคัญ: `index.html` ต้องอยู่ที่ root ของ repository ไม่ควรอยู่ซ้อนใน folder อีกชั้น
