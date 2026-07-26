FROM node:20-alpine

WORKDIR /app

# OmniRoute proxy
COPY package*.json ./
RUN npm install --production

# Frontend
COPY omnicode/frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

WORKDIR /app
COPY . .

EXPOSE 3000 5173

CMD ["npm", "run", "dev"]
