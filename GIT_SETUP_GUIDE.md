# دليل إعداد Git وإضافة المشروع

## الخطوة 1: تثبيت Git

### إذا لم يكن Git مثبتاً:

1. **حمّل Git:**
   - اذهب إلى: https://git-scm.com/download/win
   - حمّل النسخة المناسبة لنظامك (64-bit أو 32-bit)
   - شغّل الملف المحمّل واتبع التعليمات

2. **أعد تشغيل Terminal/Command Prompt** بعد التثبيت

3. **تحقق من التثبيت:**
   ```bash
   git --version
   ```
   يجب أن يظهر شيء مثل: `git version 2.x.x`

---

## الخطوة 2: تهيئة Git في المشروع

### افتح Terminal/Command Prompt في مجلد المشروع:

```bash
cd C:\Users\IMRANE-PC\Desktop\WebPanel
```

### ثم نفّذ الأوامر التالية:

#### 1. تهيئة Git Repository:
```bash
git init
```

#### 2. إضافة المستودع البعيد (GitHub):
```bash
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git
```

**ملاحظة:** إذا كان المستودع موجوداً بالفعل، قد تحتاج إلى:
```bash
git remote set-url origin https://github.com/NitroPc26/WebPanel-SMM.git
```

#### 3. إضافة جميع الملفات:
```bash
git add .
```

#### 4. عمل Commit:
```bash
git commit -m "Add Vercel configuration and fix deployment"
```

#### 5. تعيين Branch الرئيسي:
```bash
git branch -M main
```

#### 6. رفع الملفات إلى GitHub:
```bash
git push -u origin main
```

---

## الخطوة 3: إعداد Git للمرة الأولى (إذا لزم الأمر)

إذا كانت هذه أول مرة تستخدم Git، ستحتاج إلى:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## الأوامر الكاملة (نسخ ولصق):

```bash
# تهيئة Git
git init

# إضافة المستودع البعيد
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git

# إضافة جميع الملفات
git add .

# عمل Commit
git commit -m "Add Vercel configuration and fix deployment"

# تعيين Branch الرئيسي
git branch -M main

# رفع الملفات
git push -u origin main
```

---

## إذا كان المستودع موجوداً بالفعل على GitHub:

إذا كان المستودع موجوداً بالفعل وترغب في سحب التغييرات أولاً:

```bash
# سحب التغييرات من GitHub
git pull origin main --allow-unrelated-histories

# ثم أضف ملفاتك
git add .

# Commit
git commit -m "Add Vercel configuration and fix deployment"

# Push
git push origin main
```

---

## حل المشاكل الشائعة:

### خطأ: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/NitroPc26/WebPanel-SMM.git
```

### خطأ: "Authentication failed"
- تأكد من استخدام GitHub Personal Access Token
- أو استخدم GitHub Desktop بدلاً من Command Line

### خطأ: "Permission denied"
- تأكد من أن لديك صلاحيات الكتابة على المستودع
- تحقق من اسم المستخدم وكلمة المرور

---

## بديل: استخدام GitHub Desktop

إذا واجهت مشاكل مع Command Line:

1. **حمّل GitHub Desktop:**
   - https://desktop.github.com/

2. **افتح GitHub Desktop:**
   - File → Add Local Repository
   - اختر مجلد: `C:\Users\IMRANE-PC\Desktop\WebPanel`
   - اضغط "Add repository"

3. **ربط المستودع:**
   - Repository → Repository Settings → Remote
   - Primary remote repository: `https://github.com/NitroPc26/WebPanel-SMM.git`

4. **رفع الملفات:**
   - اكتب رسالة commit في الأسفل
   - اضغط "Commit to main"
   - اضغط "Push origin"

---

## الملفات التي سيتم رفعها:

✅ `vercel.json` - إعدادات Vercel  
✅ `api/index.js` - Serverless Function  
✅ `server.js` - تم تعديله  
✅ `VERCEL_DEPLOYMENT.md` - دليل النشر  
✅ جميع الملفات الأخرى في المشروع

---

## بعد الرفع:

1. ✅ اذهب إلى: https://github.com/NitroPc26/WebPanel-SMM
2. ✅ تحقق من أن الملفات موجودة
3. ✅ اذهب إلى Vercel Dashboard
4. ✅ اضغط "Redeploy" أو انتظر النشر التلقائي
5. ✅ تأكد من إضافة `DEMO_MODE=true` في Environment Variables

---

**ملاحظة:** تأكد من تثبيت Git أولاً قبل تنفيذ الأوامر!

