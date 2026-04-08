FROM node:25-alpine3.22

ENV  MONGO_DB_USERNAME=okorochaugomartins_db_user\
     MONGO_DB_PWD=UgochukwuMartins

RUN  mkdir -p /home/app/backend


WORKDIR /home/app/backend

COPY backend/package*.json ./
RUN  npm install

EXPOSE 5000


COPY backend/ ./

CMD  ["node", "server.js"]

