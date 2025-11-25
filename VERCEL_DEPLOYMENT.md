# دليل نشر المشروع على Vercel

## ✅ التعديلات التي تمت:

1. ✅ تم تعديل `server.js` ليعمل مع Vercel
2. ✅ تم إنشاء `vercel.json` للإعدادات
3. ✅ تم إنشاء `api/index.js` كـ Serverless Function Entry Point

## 📋 خطوات النشر على Vercel:

### 1. إضافة متغيرات البيئة (Environment Variables)

في Vercel Dashboard:
- Settings → Environment Variables
- أضف المتغيرات التالية:

```
DEMO_MODE = true
NODE_ENV = production
```

### 2. رفع المشروع إلى GitHub (إذا لم يكن موجوداً)

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

### 3. النشر على Vercel

#### الطريقة الأولى: من Vercel Dashboard
1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اضغط **"Add New Project"**
3. اختر المستودع: `NitroPc26/WebPanel-SMM`
4. Vercel سيكتشف الإعدادات تلقائياً من `vercel.json`
5. اضغط **"Deploy"**

#### الطريقة الثانية: من Terminal
```bash
npm i -g vercel
vercel
```

### 4. إعادة النشر (Redeploy)

إذا كان المشروع موجوداً بالفعل:
1. اذهب إلى المشروع في Vercel Dashboard
2. اضغط **"Deployments"**
3. اضغط على **"..."** بجانب آخر deployment
4. اختر **"Redeploy"**

## 🔧 إعدادات Vercel المطلوبة:

### Framework Preset:
- **Other** أو اتركه على **Auto-detect**

### Build Settings:
- **Root Directory:** `/` (افتراضي)
- **Build Command:** (فارغ - Vercel سيكتشفه تلقائياً)
- **Output Directory:** (فارغ - لا حاجة له)

### Environment Variables:
- `DEMO_MODE` = `true` ✅ **مهم جداً**
- `NODE_ENV` = `production`

## ⚠️ ملاحظات مهمة:

1. **DEMO_MODE**: يجب تفعيله (`true`) لأن Vercel لا يدعم MySQL مباشرة
2. **Database**: في حالة DEMO_MODE، المشروع يستخدم Mock Data
3. **Static Files**: الملفات في `public/` ستُخدم تلقائياً
4. **API Routes**: جميع المسارات `/api/*` تعمل كـ Serverless Functions

## 🐛 حل المشاكل:

### خطأ 500: INTERNAL_SERVER_ERROR
- ✅ تأكد من إضافة `DEMO_MODE=true` في Environment Variables
- ✅ تأكد من وجود ملف `vercel.json`
- ✅ تأكد من وجود ملف `api/index.js`

### خطأ في Database Connection
- ✅ تأكد من تفعيل `DEMO_MODE=true`
- ✅ في DEMO_MODE، لا حاجة لقاعدة بيانات

### الملفات الثابتة لا تعمل
- ✅ تأكد من أن الملفات موجودة في `public/`
- ✅ تأكد من أن `server.js` يخدم الملفات الثابتة بشكل صحيح

## 📝 الملفات المضافة/المعدلة:

- ✅ `vercel.json` - إعدادات Vercel
- ✅ `api/index.js` - Serverless Function Entry Point
- ✅ `server.js` - تم تعديله ليعمل مع Vercel

## 🚀 بعد النشر:

بعد النشر الناجح، ستحصل على رابط مثل:
```
https://webpanel-beryl.vercel.app
```

يمكنك الوصول إلى:
- الصفحة الرئيسية: `/`
- تسجيل الدخول: `/login`
- Dashboard: `/dashboard`
- API: `/api/*`

---

**ملاحظة**: تأكد من إضافة `DEMO_MODE=true` في Environment Variables قبل النشر!

