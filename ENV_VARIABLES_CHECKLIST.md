# Environment Variables Checklist for Render.com

Use this checklist when setting up environment variables in your Render dashboard.

Copy values from your local `.env` file to Render's environment variable settings.

---

## Required Variables

### Server Configuration
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `5000` (Render overrides this automatically)

### Database
- [ ] `MONGO_URI` = `mongodb+srv://...` (copy from your .env file)

### Authentication & Security
- [ ] `JWT_SECRET` = (copy from your .env - must be ≥16 characters)
- [ ] `JWT_EXPIRE` = `30d`
- [ ] `BCRYPT_SALT_ROUNDS` = `12`

### CORS Configuration
- [ ] `CLIENT_URL` = `https://your-app.pages.dev` (your Cloudflare Pages URL)

### Email Service (Brevo)
- [ ] `BREVO_API_KEY` = (copy from your .env file)
- [ ] `BREVO_FROM_EMAIL` = `noreply@aaroth.com`
- [ ] `BREVO_FROM_NAME` = `Aaroth Fresh`

### File Storage (Cloudinary)
- [ ] `CLOUDINARY_CLOUD_NAME` = (copy from your .env file)
- [ ] `CLOUDINARY_API_KEY` = (copy from your .env file)
- [ ] `CLOUDINARY_API_SECRET` = (copy from your .env file)

---

## Optional Variables (Background Services)

These are disabled by default for the free tier. Leave them as `false`:

- [ ] `ENABLE_SLA_MONITORING` = `false`
- [ ] `ENABLE_INVENTORY_MONITORING` = `false`
- [ ] `INVENTORY_CHECK_INTERVAL` = `60`

---

## How to Add Variables in Render:

1. Go to your service in Render dashboard
2. Click **"Environment"** in the left sidebar
3. Click **"Add Environment Variable"**
4. Enter the **Key** and **Value** for each variable above
5. Click **"Save Changes"**

---

## Important Notes:

### MongoDB Atlas Configuration:
Before deploying, ensure MongoDB Atlas allows connections from anywhere:
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add: `0.0.0.0/0` (Allow access from anywhere)
4. This is required because Render uses dynamic IPs

### CLIENT_URL Must Match:
- Your `CLIENT_URL` must **exactly match** your Cloudflare Pages domain
- Example: `https://aaroth-fresh.pages.dev` (no trailing slash)
- Without this, you'll get CORS errors

### Sensitive Variables:
These values are marked as `sync: false` in `render.yaml`, meaning you must set them manually:
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `BREVO_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Never commit these values to Git!

---

## Quick Copy Template

Here's a template you can fill out before adding to Render:

```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://aarothfresh:YOUR_PASSWORD@aarothfresh.wlbb9s8.mongodb.net/v1?retryWrites=true&w=majority&appName=AarothFresh
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_EXPIRE=30d
BCRYPT_SALT_ROUNDS=12
CLIENT_URL=https://YOUR-APP.pages.dev
BREVO_API_KEY=YOUR_BREVO_KEY
BREVO_FROM_EMAIL=noreply@aaroth.com
BREVO_FROM_NAME=Aaroth Fresh
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
ENABLE_SLA_MONITORING=false
ENABLE_INVENTORY_MONITORING=false
INVENTORY_CHECK_INTERVAL=60
```

Replace the placeholders with your actual values from your local `.env` file.

---

## After Setting Variables:

1. Click **"Save Changes"** in Render
2. Render will automatically **redeploy your app** with the new variables
3. Wait for deployment to complete
4. Test your endpoints to ensure everything works

---

## Troubleshooting:

### If your app fails to start after adding variables:

1. Check **Logs** tab in Render dashboard
2. Look for error messages about missing variables
3. Common issues:
   - Typo in variable names (must match exactly)
   - Missing required variables
   - Invalid MongoDB connection string
   - JWT_SECRET less than 16 characters

### If you get CORS errors:

1. Double-check `CLIENT_URL` matches your frontend exactly
2. Ensure no trailing slash in `CLIENT_URL`
3. Frontend must use `https://` when calling backend
