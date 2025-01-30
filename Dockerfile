FROM node:18.17

WORKDIR /app

# Install your app here...

COPY package*.json ./
COPY prisma ./prisma/ 

RUN npm ci

COPY . .

RUN npm run generate:prisma

RUN npm run build

CMD [ "npm", "run", "start:prod" ]
