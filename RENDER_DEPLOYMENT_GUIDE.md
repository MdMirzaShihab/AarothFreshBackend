# Render.com Deployment Guide for Aaroth Fresh Backend

This guide will walk you through deploying your Express.js backend to Render.com's **FREE tier**.

---

## Prerequisites

1. Your code should be in a **Git repository** (GitHub, GitLab, or Bitbucket)
2. A Render.com account (free, no credit card required)
3. Your Cloudflare Pages frontend URL (for CORS configuration)

---

## Step 1: Push Your Code to Git

Before deploying, ensure your backend code is pushed to a Git repository.

### If you don't have a Git repository yet:

```bash
cd /Users/pdcl_creative/Downloads/CodeLib/Aaroth/AarothFresh/AarothFreshBackend

# Initialize git (if not already initialized)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare backend for Render deployment"

# Create a repository on GitHub/GitLab and push
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

---

## Step 2: Create a Render Account

1. Go to **https://render.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with GitHub, GitLab, or email (recommended: use GitHub for easier integration)
4. **No credit card required** for the free tier

---

## Step 3: Deploy Your Backend (Two Options)

### **Option A: Using Blueprint (Recommended - Easiest)**

Since I've created `render.yaml` for you, this is the easiest method:

1. **Log in to Render Dashboard**: https://dashboard.render.com

2. **Click "New +" → "Blueprint"**

3. **Connect Your Repository**:
   - If using GitHub: Authorize Render to access your repositories
   - Select your backend repository
   - Click "Connect"

4. **Render will automatically detect `render.yaml`**:
   - It will show "aaroth-fresh-backend" service
   - Review the configuration
   - Click "Apply"

5. **Set Environment Variables** (see Step 4 below)

6. **Click "Create Web Service"**

---

### **Option B: Manual Setup (Alternative)**

If you prefer manual configuration:

1. **Log in to Render Dashboard**: https://dashboard.render.com

2. **Click "New +" → "Web Service"**

3. **Connect Your Repository**:
   - Authorize Render to access your repo
   - Select your backend repository
   - Click "Connect"

4. **Configure Service Settings**:

   | Field | Value |
   |-------|-------|
   | **Name** | `aaroth-fresh-backend` (or your choice) |
   | **Region** | `Oregon (US West)` or `Singapore` (free tier available) |
   | **Branch** | `main` (or your default branch) |
   | **Root Directory** | Leave blank (or `AarothFreshBackend` if in monorepo) |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | **Free** |

5. **Advanced Settings**:
   - **Health Check Path**: `/api/v1/health`
   - **Auto-Deploy**: `Yes` (recommended)

6. **Set Environment Variables** (see Step 4 below)

7. **Click "Create Web Service"**

---

## Step 4: Configure Environment Variables

After creating the service, you need to add environment variables:

1. **In your Render service dashboard**, scroll to **"Environment"** section

2. **Click "Add Environment Variable"**

3. **Add each variable** from the list below:

### Required Environment Variables:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `5000` | Render will override this automatically |
| `MONGO_URI` | `mongodb+srv://aarothfresh:...` | Copy from your `.env` file |
| `JWT_SECRET` | Your secret (min 16 chars) | Copy from your `.env` file |
| `JWT_EXPIRE` | `30d` | Or your preferred value |
| `BCRYPT_SALT_ROUNDS` | `12` | Security setting |
| `CLIENT_URL` | `https://your-app.pages.dev` | **YOUR CLOUDFLARE PAGES URL** |
| `BREVO_API_KEY` | Your Brevo API key | Copy from your `.env` file |
| `BREVO_FROM_EMAIL` | `noreply@aaroth.com` | Your sender email |
| `BREVO_FROM_NAME` | `Aaroth Fresh` | Your sender name |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | Copy from your `.env` file |
| `CLOUDINARY_API_KEY` | Your API key | Copy from your `.env` file |
| `CLOUDINARY_API_SECRET` | Your API secret | Copy from your `.env` file |

### Optional Variables (for background services):

| Key | Value | Notes |
|-----|-------|-------|
| `ENABLE_SLA_MONITORING` | `false` | Leave false for free tier |
| `ENABLE_INVENTORY_MONITORING` | `false` | Leave false for free tier |
| `INVENTORY_CHECK_INTERVAL` | `60` | Minutes (if enabled) |

4. **Click "Save Changes"**

---

## Step 5: Monitor Deployment

1. **Render will start building your app** automatically
2. Watch the **Logs** tab to see build progress
3. The build process will:
   - Install Node.js 18.19.0 (from `.node-version`)
   - Run `npm install`
   - Run `npm start`
4. **Wait for "Server running" message** in logs
5. Once deployed, you'll see a **green "Live"** status

---

## Step 6: Get Your Backend URL

1. **In the Render dashboard**, find your service
2. Look for the **URL** at the top (format: `https://aaroth-fresh-backend.onrender.com`)
3. **Copy this URL** - you'll need it for your frontend

---

## Step 7: Test Your Deployment

### Test the health check endpoint:

Visit in your browser or use curl:

```bash
https://your-app-name.onrender.com/api/v1/health
```

You should see:

```json
{
  "success": true,
  "message": "API is running",
  "environment": "production"
}
```

### Test other endpoints:

```bash
# Check public endpoint
https://your-app-name.onrender.com/api/v1/public/categories

# Test login (replace with actual phone)
curl -X POST https://your-app-name.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+8801234567890", "password": "yourpassword"}'
```

---

## Step 8: Update Your Frontend

Now that your backend is deployed, update your frontend configuration:

### In your Cloudflare Pages frontend:

1. **Update the API base URL** in your frontend code
2. Usually in a config file or `.env`:

```env
VITE_API_BASE_URL=https://your-app-name.onrender.com/api/v1
```

3. **Redeploy your frontend** to Cloudflare Pages

---

## Step 9: Configure CORS (Important!)

Make sure your `CLIENT_URL` environment variable in Render matches your Cloudflare Pages URL:

- **If your frontend is**: `https://aaroth-fresh.pages.dev`
- **Set CLIENT_URL to**: `https://aaroth-fresh.pages.dev`

Without this, you'll get CORS errors!

---

## Understanding Free Tier Limitations

### What You Get (FREE):
- 750 hours/month (enough for 24/7 uptime for 1 service)
- 512 MB RAM
- Shared CPU
- Automatic SSL certificates
- Automatic deployments from Git

### Important Limitations:
1. **Cold Starts**:
   - Your app will "spin down" after **15 minutes of inactivity**
   - First request after spin-down takes **30-60 seconds** to wake up
   - Subsequent requests are fast

2. **How to minimize impact**:
   - Add a health check ping service (like UptimeRobot - free)
   - Accept the delay during low-traffic periods
   - Upgrade to paid plan ($7/month) for always-on

---

## Monitoring Your Deployment

### View Logs:
1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. See real-time application logs

### View Metrics:
1. Click **"Metrics"** tab
2. See CPU, memory, and request metrics

### Set Up Alerts:
1. Click **"Settings"** tab
2. Configure deploy notifications via email/Slack

---

## Troubleshooting

### Build Fails:

**Issue**: `npm install` fails

**Solution**:
- Check your `package.json` has all dependencies listed
- Check Node.js version compatibility in logs

---

### App Crashes on Start:

**Issue**: Server won't start

**Solution**:
- Check **Logs** for error messages
- Common issues:
  - Missing environment variables (especially `JWT_SECRET`, `MONGO_URI`)
  - MongoDB connection failure (check your MongoDB Atlas IP whitelist - add `0.0.0.0/0` to allow all IPs)
  - Port configuration (should use `process.env.PORT` - already configured)

---

### CORS Errors:

**Issue**: Frontend can't connect to backend

**Solution**:
- Verify `CLIENT_URL` environment variable matches your Cloudflare Pages URL exactly
- Check if your frontend is using HTTPS (Cloudflare Pages uses HTTPS)
- Backend URL in frontend must use `https://` not `http://`

---

### MongoDB Connection Issues:

**Issue**: Can't connect to MongoDB Atlas

**Solution**:
- Go to MongoDB Atlas → Network Access
- Add IP Address: `0.0.0.0/0` (allow from anywhere)
- This is necessary because Render uses dynamic IPs

---

### Slow First Request:

**Issue**: First API call takes 30-60 seconds

**Solution**:
- This is normal for free tier (cold start)
- Options:
  1. Accept it for MVP/testing
  2. Use a ping service (UptimeRobot.com - free) to keep it warm
  3. Upgrade to paid plan ($7/month for always-on)

---

## Keeping Your App Warm (Optional)

To prevent cold starts, use a free monitoring service:

### UptimeRobot (Recommended):

1. Sign up at **https://uptimerobot.com** (free)
2. Create a new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app-name.onrender.com/api/v1/health`
   - **Interval**: 5 minutes
3. This pings your app every 5 minutes, keeping it warm

---

## Upgrading to Paid Plan (When Ready)

When your app grows and you need better performance:

### Starter Plan ($7/month):
- Always-on (no cold starts)
- 512 MB RAM
- Better CPU allocation

### Standard Plan ($25/month):
- 2 GB RAM
- Faster CPU
- Priority support

You can upgrade anytime from your Render dashboard.

---

## Next Steps After Deployment

1. **Test all API endpoints** thoroughly
2. **Update frontend** to use new backend URL
3. **Set up monitoring** (UptimeRobot for uptime, Render metrics for performance)
4. **Configure custom domain** (optional - Render supports this on free tier)
5. **Set up CI/CD** (already done if you enabled auto-deploy)

---

## Important Files Created for You

- ✅ `render.yaml` - Blueprint configuration for one-click deploy
- ✅ `.node-version` - Specifies Node.js version (18.19.0)
- ✅ `package.json` - Already has correct start script
- ✅ `server.js` - Already configured to use `process.env.PORT`

---

## Quick Reference Commands

### View deployment status:
```bash
# Visit your Render dashboard
https://dashboard.render.com
```

### View live logs:
```bash
# In Render dashboard → Your Service → Logs tab
```

### Redeploy manually:
```bash
# In Render dashboard → Your Service → Manual Deploy → "Deploy latest commit"
# Or just push to your main branch (if auto-deploy is enabled)
```

---

## Support & Resources

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Render Status**: https://status.render.com

---

## Summary Checklist

Before deploying, ensure you have:

- [ ] Code pushed to Git repository (GitHub/GitLab)
- [ ] Render account created
- [ ] `.node-version` file in your repo (created for you)
- [ ] `render.yaml` file in your repo (created for you)
- [ ] All environment variables ready (from your `.env` file)
- [ ] MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- [ ] Cloudflare Pages frontend URL (for `CLIENT_URL` variable)

Then follow the deployment steps above!

---

**Good luck with your deployment!** 🚀

If you encounter any issues, check the Troubleshooting section or contact me for help.
