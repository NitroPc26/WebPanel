# تعليمات رفع التعديلات إلى GitHub

## الملفات الجديدة/المعدلة التي يجب رفعها:

1. ✅ `vercel.json` - إعدادات Vercel
2. ✅ `api/index.js` - Serverless Function Entry Point
3. ✅ `server.js` - تم تعديله ليعمل مع Vercel
4. ✅ `VERCEL_DEPLOYMENT.md` - دليل النشر

---

## الطريقة 1: استخدام Git Command Line

### إذا كان Git مثبتاً:

```bash
# 1. تهيئة Git (إذا لم يكن موجوداً)
git init

# 2. إضافة المستودع البعيد (إذا لم يكن موجوداً)
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git

# 3. إضافة جميع الملفات
git add .

# 4. عمل commit
git commit -m "Add Vercel configuration and fix deployment"

# 5. رفع التعديلات
git push origin main
```

### إذا كان المستودع موجوداً بالفعل:

```bash
# 1. إضافة الملفات الجديدة
git add vercel.json api/index.js server.js VERCEL_DEPLOYMENT.md

# 2. عمل commit
git commit -m "Add Vercel configuration and fix deployment"

# 3. رفع التعديلات
git push origin main
```

---

## الطريقة 2: استخدام GitHub Desktop

1. افتح **GitHub Desktop**
2. اختر المستودع: `WebPanel-SMM`
3. ستظهر الملفات المعدلة تلقائياً
4. اكتب رسالة commit: `"Add Vercel configuration and fix deployment"`
5. اضغط **"Commit to main"**
6. اضغط **"Push origin"**

---

## الطريقة 3: رفع مباشر من GitHub Website

1. اذهب إلى: https://github.com/NitroPc26/WebPanel-SMM
2. اضغط على الملف الذي تريد تعديله (مثلاً `server.js`)
3. اضغط **"Edit"** (أيقونة القلم)
4. الصق المحتوى الجديد
5. اضغط **"Commit changes"**

### للملفات الجديدة:
1. اضغط **"Add file"** → **"Create new file"**
2. اكتب اسم الملف (مثلاً `vercel.json`)
3. الصق المحتوى
4. اضغط **"Commit new file"**

---

## الملفات التي يجب رفعها:

### 1. `vercel.json` (ملف جديد)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "env": {
    "DEMO_MODE": "true",
    "NODE_ENV": "production"
  }
}
```

### 2. `api/index.js` (ملف جديد)
```javascript
// Vercel Serverless Function Entry Point
const app = require('../server');
module.exports = app;
```

### 3. `server.js` (معدل)
- تم تعديل نهاية الملف ليعمل مع Vercel

### 4. `VERCEL_DEPLOYMENT.md` (ملف جديد)
- دليل النشر (اختياري)

---

## بعد الرفع:

1. ✅ اذهب إلى Vercel Dashboard
2. ✅ افتح المشروع
3. ✅ اضغط **"Redeploy"** أو انتظر النشر التلقائي
4. ✅ تأكد من إضافة `DEMO_MODE=true` في Environment Variables

---

## ملاحظة:

إذا لم يكن Git مثبتاً، يمكنك:
- تثبيت Git من: https://git-scm.com/download/win
- أو استخدام GitHub Desktop من: https://desktop.github.com/
- أو رفع الملفات مباشرة من موقع GitHub

