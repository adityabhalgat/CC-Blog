# AWS EC2 Deployment Guide (Frontend + Backend on Same Machine)

This guide deploys your full-stack blog app on one EC2 instance:
- Frontend (React build) served by Nginx
- Backend (Express API) running with PM2 on port 4000
- PostgreSQL hosted externally (Neon)

## 1. Prerequisites

Before starting, keep these ready:
- AWS account
- Your Git repository URL
- Your Neon PostgreSQL connection string
- (Optional but recommended) Domain name

## 2. Create and Launch EC2 Instance

1. Open AWS Console -> EC2 -> Launch Instance.
2. Name: `blog-app-prod`.
3. AMI: `Ubuntu Server 24.04 LTS` (or 22.04 LTS).
4. Instance type: `t2.micro` (free tier) or `t3.micro`.
5. Key pair: create/download `.pem` file.
6. Network/Security Group inbound rules:
   - SSH: `22` (My IP)
   - HTTP: `80` (Anywhere)
   - HTTPS: `443` (Anywhere)
7. Launch instance.

Important:
- Do not open port `4000` publicly.
- Backend will be accessed internally via Nginx reverse proxy.

## 3. Connect to EC2

From your local terminal:

```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

## 4. Install System Dependencies

Run on EC2:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx curl
```

Install Node.js 22 and npm:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2 globally:

```bash
sudo npm install -g pm2
pm2 -v
```

## 5. Clone and Setup Project

```bash
cd /home/ubuntu
git clone YOUR_REPO_URL blog-application
cd blog-application
npm install
```

## 6. Configure Environment Variables

Create backend env file:

```bash
cat > server/.env << 'EOF'
PORT=4000
CLIENT_ORIGIN=http://YOUR_EC2_PUBLIC_IP
DATABASE_URL="YOUR_NEON_DATABASE_URL"
EOF
```

If you have a domain, replace `CLIENT_ORIGIN` with:

```bash
CLIENT_ORIGIN=https://yourdomain.com
```

## 7. Push Prisma Schema to Database

```bash
cd /home/ubuntu/blog-application/server
npm run db:push
```

Expected success message includes:
- `Your database is now in sync with your Prisma schema`

## 8. Build Frontend

From project root:

```bash
cd /home/ubuntu/blog-application
npm run build --workspace client
```

This generates static files in:
- `/home/ubuntu/blog-application/client/dist`

## 9. Start Backend with PM2

From project root:

```bash
cd /home/ubuntu/blog-application
pm2 start "npm run start --workspace server" --name blog-server
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Run the command printed by `pm2 startup` (it usually starts with `sudo env ...`).

Check status:

```bash
pm2 status
pm2 logs blog-server --lines 100
```

## 10. Configure Nginx (Serve Frontend + Proxy API)

Create Nginx site config:

```bash
sudo tee /etc/nginx/sites-available/blog-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    root /home/ubuntu/blog-application/client/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /posts {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable site and restart Nginx:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/blog-app /etc/nginx/sites-enabled/blog-app
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 11. Test Deployment

1. Open browser:
   - `http://YOUR_EC2_PUBLIC_IP`
2. App should load.
3. Create a blog post from UI.
4. Refresh and verify data persists.

Health check from terminal:

```bash
curl http://YOUR_EC2_PUBLIC_IP/health
```

Expected:

```json
{"status":"ok"}
```

## 12. Optional: Add Domain + HTTPS (Recommended)

### 12.1 Point Domain to EC2

In your DNS provider:
- Add `A` record for `yourdomain.com` -> `YOUR_EC2_PUBLIC_IP`
- Add `A` record for `www.yourdomain.com` -> `YOUR_EC2_PUBLIC_IP`

### 12.2 Update Nginx server_name

Edit config:

```bash
sudo nano /etc/nginx/sites-available/blog-app
```

Change:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

Reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 12.3 Install Certbot and Enable HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Choose redirect to HTTPS when prompted.

Update backend env for CORS and restart:

```bash
cd /home/ubuntu/blog-application
sed -i 's|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=https://yourdomain.com|' server/.env
pm2 restart blog-server
```

## 13. Common Update Workflow

Whenever you push new code:

```bash
cd /home/ubuntu/blog-application
git pull
npm install
npm run db:push --workspace server
npm run build --workspace client
pm2 restart blog-server
sudo systemctl reload nginx
```

## 14. Useful Commands (Ops)

PM2:

```bash
pm2 status
pm2 logs blog-server --lines 200
pm2 restart blog-server
pm2 stop blog-server
```

Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## 15. Troubleshooting

### Backend says DATABASE_URL is required
- Ensure file exists: `/home/ubuntu/blog-application/server/.env`
- Ensure `DATABASE_URL` is present and quoted.
- Restart backend: `pm2 restart blog-server`

### Frontend loads but API fails
- Check backend logs: `pm2 logs blog-server --lines 200`
- Check Nginx proxy config has `/posts` and `/health` locations.
- Check process is listening on 4000.

### 502 Bad Gateway from Nginx
- Backend process likely down.
- Restart backend and recheck PM2 status.

### Permission issues on deploy folder
- Keep app under `/home/ubuntu/blog-application`.
- Avoid running app with `sudo`.

---

Deployment architecture (single EC2):
- Browser -> Nginx (`80/443`) ->
  - Static frontend from `client/dist`
  - API proxy to Express on `127.0.0.1:4000`
- Express -> Neon PostgreSQL
