init.sh

#!/bin/bash

echo "🚀 Starting Full Stack Deployment..."

# -------------------------------
# 1. Update system
# -------------------------------
sudo apt update -y
sudo apt install nginx git curl -y

# -------------------------------
# 2. Install NVM + Node 20
# -------------------------------
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

export NVM_DIR="$HOME/.nvm"
\. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

# -------------------------------
# 3. Fix RAM issue
# -------------------------------
sudo fallocate -l 1G /swapfile || true
sudo chmod 600 /swapfile
sudo mkswap /swapfile || true
sudo swapon /swapfile || true

# -------------------------------
# 4. Install PM2
# -------------------------------
npm install -g pm2

# -------------------------------
# 5. Clone repo
# -------------------------------
cd ~
rm -rf CC-Blog
git clone https://github.com/adityabhalgat/CC-Blog.git
cd CC-Blog

# -------------------------------
# 6. Backend setup
# -------------------------------
cd server

npm install

# Prisma fix
npx prisma generate
npx prisma db push

# Create .env
cat <<EOT > .env
PORT=4000
CLIENT_ORIGIN=http://13.233.14.134
DATABASE_URL=postgresql://neondb_owner:npg_OQ2qby7ACemd@ep-super-salad-an0x4wp3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
EOT

# Start backend
pm2 delete all
pm2 start src/index.js --name blog-server
pm2 save

# -------------------------------
# 7. Frontend (client)
# -------------------------------
cd ../client

npm install

cat <<EOT > .env
VITE_API_URL=
EOT

npm run build

# Deploy frontend
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# -------------------------------
# 8. Nginx config
# -------------------------------
sudo bash -c 'cat > /etc/nginx/sites-available/default' <<EOT
server {
    listen 80;
    server_name _;

    root /var/www/html;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /posts {
        proxy_pass http://localhost:4000;
    }

    location /auth {
        proxy_pass http://localhost:4000;
    }
}
EOT

sudo systemctl restart nginx

echo "✅ Deployment Done!"
echo "👉 Now run: ./pm2-setup.sh"



pm2 sh

#!/bin/bash

echo "⚙️ Setting up PM2 startup..."

PM2_PATH="/home/ubuntu/.nvm/versions/node/v20.20.2"

sudo env PATH=$PATH:$PM2_PATH/bin \
$PM2_PATH/lib/node_modules/pm2/bin/pm2 \
startup systemd -u ubuntu --hp /home/ubuntu

pm2 save

echo "✅ PM2 startup configured!"
