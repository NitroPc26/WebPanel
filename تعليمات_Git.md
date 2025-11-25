# تعليمات إضافة المشروع إلى Git

## ⚠️ ملاحظة مهمة:
Git غير مثبت على جهازك حالياً. يجب تثبيته أولاً.

---

## 📥 الخطوة 1: تثبيت Git

### الطريقة السريعة:
1. افتح المتصفح واذهب إلى: **https://git-scm.com/download/win**
2. حمّل Git للويندوز
3. شغّل الملف المحمّل واتبع التعليمات (اضغط Next في كل خطوة)
4. **أعد تشغيل Terminal/Command Prompt** بعد التثبيت

### التحقق من التثبيت:
افتح Terminal جديد واكتب:
```bash
git --version
```
إذا ظهر رقم الإصدار، فالتثبيت نجح ✅

---

## 🚀 الخطوة 2: إضافة المشروع إلى Git

بعد تثبيت Git، افتح Terminal في مجلد المشروع:

### 1. افتح Terminal في مجلد المشروع:
```bash
cd C:\Users\IMRANE-PC\Desktop\WebPanel
```

### 2. تهيئة Git:
```bash
git init
```

### 3. ربط المشروع بـ GitHub:
```bash
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git
```

### 4. إضافة جميع الملفات:
```bash
git add .
```

### 5. حفظ التغييرات:
```bash
git commit -m "Add Vercel configuration"
```

### 6. رفع الملفات إلى GitHub:
```bash
git branch -M main
git push -u origin main
```

---

## 📋 الأوامر الكاملة (انسخها كلها):

```bash
cd C:\Users\IMRANE-PC\Desktop\WebPanel
git init
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git
git add .
git commit -m "Add Vercel configuration and fix deployment"
git branch -M main
git push -u origin main
```

---

## 🔐 إذا طُلب منك اسم المستخدم وكلمة المرور:

### للاسم المستخدم:
- استخدم اسم المستخدم على GitHub (مثلاً: `NitroPc26`)

### لكلمة المرور:
- **لا تستخدم كلمة مرور GitHub العادية**
- استخدم **Personal Access Token** بدلاً منها

### كيفية إنشاء Personal Access Token:
1. اذهب إلى: https://github.com/settings/tokens
2. اضغط **"Generate new token"** → **"Generate new token (classic)"**
3. اكتب اسم للتوكن (مثلاً: "WebPanel")
4. اختر الصلاحيات: ✅ **repo** (كل الصلاحيات)
5. اضغط **"Generate token"**
6. **انسخ التوكن فوراً** (لن يظهر مرة أخرى!)
7. استخدم هذا التوكن ككلمة مرور عند `git push`

---

## 🎯 بديل أسهل: GitHub Desktop

إذا واجهت مشاكل مع Command Line:

1. **حمّل GitHub Desktop:**
   - https://desktop.github.com/
   - ثبّته وافتحه

2. **سجّل الدخول:**
   - Sign in to GitHub
   - استخدم حساب GitHub الخاص بك

3. **أضف المشروع:**
   - File → Add Local Repository
   - اختر: `C:\Users\IMRANE-PC\Desktop\WebPanel`
   - اضغط "Add repository"

4. **ربط المستودع:**
   - Repository → Repository Settings → Remote
   - Primary remote: `https://github.com/NitroPc26/WebPanel-SMM.git`

5. **رفع الملفات:**
   - اكتب رسالة في الأسفل: "Add Vercel configuration"
   - اضغط **"Commit to main"**
   - اضغط **"Push origin"**

---

## ✅ بعد الرفع:

1. اذهب إلى: https://github.com/NitroPc26/WebPanel-SMM
2. تحقق من وجود الملفات الجديدة:
   - ✅ `vercel.json`
   - ✅ `api/index.js`
   - ✅ `server.js` (معدل)
3. اذهب إلى Vercel Dashboard
4. اضغط **"Redeploy"**

---

## 🆘 إذا واجهت مشاكل:

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git
```

### "Authentication failed"
- استخدم Personal Access Token بدلاً من كلمة المرور
- أو استخدم GitHub Desktop

### "Permission denied"
- تأكد من أن المستودع موجود على GitHub
- تأكد من أن لديك صلاحيات الكتابة

---

**ابدأ بتثبيت Git أولاً، ثم اتبع الخطوات!** 🚀

