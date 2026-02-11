mkdir vmix-replay-bridge
cd vmix-replay-bridge
npm init -y
npm i express cors node-fetch


# Mac/Linux
export VMIX_HOST="192.168.1.50"   # your vMix PC IP
export PORT=5050
node server.js

http://BRIDGE-IP:5050/health
