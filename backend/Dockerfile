FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 4000

<<<<<<< HEAD
CMD ["node", "server.js"]
=======
CMD ["node", "server.js"]
>>>>>>> develop
