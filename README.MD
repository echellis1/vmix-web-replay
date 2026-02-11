mkdir vmix-replay-bridge
cd vmix-replay-bridge
npm init -y
npm i express cors node-fetch


# Mac/Linux
export VMIX_HOST="192.168.1.50"   # your vMix PC IP
export PORT=5050
node server.js

http://BRIDGE-IP:5050/health

# Create App
npm create vite@latest vmix-replay-ui -- --template react
cd vmix-replay-ui
npm i

#Add .env (Vite uses VITE_)

Create vmix-replay-ui/.env:

VITE_BRIDGE_BASE=http://BRIDGE-IP:5050
Optional if you enabled AUTH_TOKEN on the bridge:
VITE_AUTH_TOKEN=yourtoken

Then open on iPad/laptop:
http://YOUR-UI-MACHINE-IP:5173
