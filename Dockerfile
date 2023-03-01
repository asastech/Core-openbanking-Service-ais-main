FROM node:19.2.0-alpine3.15 AS BUILDER

WORKDIR /app

RUN apk add --no-cache --update --virtual .gyp python3 make g++ gcc python3-dev

COPY package.json yarn.lock ./

RUN yarn global add node-gyp

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma:generate

RUN yarn build

RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

FROM node:19.2.0-alpine3.15

WORKDIR /app

RUN apk add tini

ENV NODE_ENV production

RUN adduser -D node-user -G node
USER node-user

COPY --chown=node-user:node --from=BUILDER /app .

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "/app/dist", "--max-old-space-size=400"]
