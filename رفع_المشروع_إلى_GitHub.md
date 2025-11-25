# رفع المشروع إلى المستودع الجديد: smmpanel

## 📍 المستودع الجديد:
**https://github.com/NitroPc26/smmpanel**

---

## 🚀 الطريقة 1: استخدام Git Command Line (الأسرع)

### الخطوة 1: تثبيت Git
1. حمّل من: https://git-scm.com/download/win
2. ثبّته وأعد تشغيل Terminal

### الخطوة 2: رفع الملفات
افتح Terminal في مجلد المشروع ونفّذ:

```bash
cd C:\Users\IMRANE-PC\Desktop\WebPanel

# تهيئة Git
git init

# ربط المستودع الجديد
git remote add origin https://github.com/NitroPc26/smmpanel.git

# إضافة جميع الملفات
git add .

# حفظ التغييرات
git commit -m "Initial commit: Add WebPanel project with Vercel configuration"

# رفع الملفات
git branch -M main
git push -u origin main
```

---

## 🎯 الطريقة 2: استخدام GitHub Desktop (الأسهل)

### الخطوة 1: تثبيت GitHub Desktop
1. حمّل من: https://desktop.github.com/
2. ثبّته وافتحه
3. سجّل الدخول بحساب GitHub

### الخطوة 2: إضافة المشروع
1. في GitHub Desktop:
   - File → Add Local Repository
   - اختر: `C:\Users\IMRANE-PC\Desktop\WebPanel`
   - اضغط "Add repository"

2. ربط المستودع:
   - Repository → Repository Settings → Remote
   - Primary remote repository: `https://github.com/NitroPc26/smmpanel.git`
   - اضغط "Save"

3. رفع الملفات:
   - اكتب رسالة: "Initial commit: Add WebPanel project with Vercel configuration"
   - اضغط "Commit to main"
   - اضغط "Push origin"

---

## 📤 الطريقة 3: رفع مباشر من موقع GitHub (للملفات المهمة فقط)

⚠️ هذه الطريقة طويلة لأنك سترفع كل ملف على حدة

### للملفات المهمة فقط:

1. اذهب إلى: https://github.com/NitroPc26/smmpanel
2. اضغط "Add file" → "Upload files"
3. اسحب الملفات المهمة:
   - `vercel.json`
   - `api/index.js`
   - `server.js`
   - `package.json`
   - `README.md`
   - مجلد `public/`
   - مجلد `routes/`
   - مجلد `config/`
   - مجلد `middleware/`
   - مجلد `utils/`

---

## ✅ الملفات التي سيتم رفعها:

### ملفات الإعداد:
- ✅ `vercel.json` - إعدادات Vercel
- ✅ `package.json` - Dependencies
- ✅ `.gitignore` - موجود بالفعل
- ✅ `README.md` - وثائق المشروع

### ملفات الكود:
- ✅ `server.js` - الخادم الرئيسي
- ✅ `api/index.js` - Vercel Serverless Function
- ✅ مجلد `routes/` - جميع المسارات
- ✅ مجلد `config/` - إعدادات قاعدة البيانات
- ✅ مجلد `middleware/` - Middleware
- ✅ مجلد `utils/` - Utilities

### ملفات الواجهة:
- ✅ مجلد `public/` - جميع صفحات HTML و CSS و JS

### ملفات التوثيق:
- ✅ `API_DOCUMENTATION.md`
- ✅ `VERCEL_DEPLOYMENT.md`

### ملفات لن يتم رفعها (موجودة في .gitignore):
- ❌ `node_modules/` - سيتم تثبيتها تلقائياً
- ❌ `.env` - متغيرات البيئة
- ❌ `package-lock.json` - سيتم إنشاؤه تلقائياً
- ❌ `WebPanel.rar` - ملف ضغط

---

## 🔐 عند طلب اسم المستخدم وكلمة المرور:

### اسم المستخدم:
```
NitroPc26
```

### كلمة المرور:
استخدم **Personal Access Token** (ليس كلمة مرور GitHub):

1. اذهب إلى: https://github.com/settings/tokens
2. اضغط "Generate new token" → "Generate new token (classic)"
3. اكتب اسم: "smmpanel"
4. اختر الصلاحيات: ✅ **repo** (كل الصلاحيات)
5. اضغط "Generate token"
6. **انسخ التوكن** (لن يظهر مرة أخرى!)
7. استخدمه ككلمة مرور عند `git push`

---

## 🎯 بعد الرفع:

1. ✅ تحقق من المستودع: https://github.com/NitroPc26/smmpanel
2. ✅ تأكد من وجود جميع الملفات
3. ✅ اذهب إلى Vercel Dashboard
4. ✅ أضف المشروع الجديد أو غيّر المستودع إلى `smmpanel`
5. ✅ أضف Environment Variables:
   - `DEMO_MODE` = `true`
   - `NODE_ENV` = `production`
6. ✅ اضغط "Deploy"

---

## 🆘 إذا واجهت مشاكل:

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/NitroPc26/smmpanel.git
```

### "Authentication failed"
- استخدم Personal Access Token
- أو استخدم GitHub Desktop

---

**الطريقة الموصى بها: GitHub Desktop (الأسهل والأسرع)** 🚀

