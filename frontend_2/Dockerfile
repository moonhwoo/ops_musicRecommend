FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Vite dev 서버 (host 0.0.0.0 로 바인딩 필수)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
