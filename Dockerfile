FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install pm2 -g

EXPOSE 3000

RUN echo 'module.exports = {"apps": [{"name": "index", "script": "index.js"}, {"name": "bot", "script": "bot.js"}]}' > pm2.config.js

CMD ["pm2-runtime", "start", "pm2.config.js"]