#!/bin/bash

echo " Setting up PM2 startup..."

PM2_PATH="/home/ubuntu/.nvm/versions/node/v20.20.2"

sudo env PATH=$PATH:$PM2_PATH/bin \
$PM2_PATH/lib/node_modules/pm2/bin/pm2 \
startup systemd -u ubuntu --hp /home/ubuntu

pm2 save

echo "✅ PM2 startup configured!"

