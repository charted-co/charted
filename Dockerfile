FROM node:6.7.0

ADD . /srv/app
WORKDIR /srv/app
RUN npm install

CMD ["npm", "start"]

EXPOSE 3000
