# 🚀 Hostinger Deployment Blueprint for `bga.aaditechs.in`

A complete step-by-step guide to deploying **Aaditech BGA** on **Hostinger Business Web Hosting** with MySQL, LiteSpeed Web Server, and Node.js.

---

### 1. Subdomain Setup in Hostinger
1. Login to **Hostinger hPanel** (hpanel.hostinger.com).
2. Go to **Websites** ➔ Click **Manage** on `aaditechs.in`.
3. In the left sidebar, click **Domains** ➔ **Subdomains**.
4. Enter:
   * **Subdomain Name:** `bga`
   * **Custom folder for subdomain:** Check this box and keep `/public_html/bga` or `/domains/bga.aaditechs.in`.
5. Click **Create**.
6. (Optional) Go to **Security** ➔ **SSL** and issue free Let's Encrypt SSL for `bga.aaditechs.in`.

---

### 2. Create MySQL Database in Hostinger
1. In hPanel, navigate to **Databases** ➔ **Management**.
2. Under **Create a New MySQL Database and User**:
   * **Database Name:** e.g., `u123456789_bga_db`
   * **Username:** e.g., `u123456789_bga_user`
   * **Password:** Set a strong password (save this safely).
3. Click **Create**.
4. In the database list, click **Enter phpMyAdmin**.
5. Click on your database name on the left ➔ Click **Import** tab on the top menu.
6. Click **Choose File** ➔ Select the `schema.sql` file from this project ➔ Click **Go / Import**.
   * *This provisions all 8 production multi-tenant tables with strict company isolation:*
     - `users` (PBKDF2 salted password authentication & RBAC roles)
     - `companies` (multi-tenant accounts, Google Place IDs, autopilot configurations)
     - `company_profiles_data` (isolated metrics, audits, competitors JSON payloads)
     - `leads` (tenant-isolated CRM leads with indexed `company_id`)
     - `reviews` (reputation reviews with indexed `company_id`)
     - `content_posts` (social post queue with indexed `company_id`)
     - `autonomous_actions` (AI action logs with indexed `company_id`)
     - `business_profile` (public business NAP details)
   * *Note: The Node.js server (`server/db.ts`) also includes built-in proactive self-healing migrations. If you previously imported an older schema, the system will automatically run `ALTER TABLE` to append any missing `company_id` columns and indexes without downtime or data loss.*

---

### 3. Deploy Application via Git or File Manager

#### Option A: Automatic Git Deployment (Recommended)
1. Push your repository to **GitHub**.
2. In Hostinger hPanel, go to **Advanced** ➔ **Git**.
3. Under **Create a New Repository**:
   * **Repository:** Your GitHub repository URL (e.g., `https://github.com/your-username/aaditech-bga.git`).
   * **Branch:** `main`
   * **Directory:** `/domains/bga.aaditechs.in` (or your subdomain directory).
4. Click **Create**.
5. Enable **Auto Deployment Webhook** so future `git push` will auto-update the site!

#### Option B: Build & Upload Zip
1. On your local machine / workspace:
   ```bash
   npm install
   npm run build
   ```
2. Compress the project (or `dist/` + `server/` + `package.json` + `dist/server.cjs` + `.htaccess`).
3. Upload and extract into the subdomain directory via **File Manager**.

---

### 4. Configure Node.js Web App in Hostinger
1. In hPanel, search or click **Node.js** under the **Advanced** section.
2. Click **Create Application**:
   * **Node.js Version:** `20.x` or `22.x`
   * **Application Mode:** `Production`
   * **Application Root:** `/domains/bga.aaditechs.in` (or folder path where code was deployed)
   * **Application Startup File:** `dist/server.cjs`
3. In the **Environment Variables** section, add the following:
   ```env
   NODE_ENV=production
   PORT=3000
   APP_URL=https://bga.aaditechs.in
   GEMINI_API_KEY=your_gemini_api_key_here
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=u123456789_bga_db
   DB_USER=u123456789_bga_user
   DB_PASSWORD=your_mysql_password_here
   TELEGRAM_BOT_TOKEN=optional_telegram_bot_token
   TELEGRAM_CHAT_ID=optional_telegram_chat_id
   ```
4. Open the SSH terminal or npm button in hPanel and run:
   ```bash
   npm install --omit=dev
   npm run build
   ```
5. Click **Restart Application**.

---

### 5. Verify the Deployment
* Visit **https://bga.aaditechs.in** in your browser.
* Test health check: **https://bga.aaditechs.in/api/system/status**
  * Should return:
    ```json
    {
      "app": "Aaditech BGA",
      "subdomain": "bga.aaditechs.in",
      "environment": "production",
      "mysqlConfigured": true,
      "geminiConfigured": true
    }
    ```
* Open **Unified Lead CRM** ➔ Click **Record Inbound Lead** to test adding a real lead.
* Click **Send via WhatsApp API** ➔ Opens WhatsApp Web/Mobile with tailored pitch instantly!
