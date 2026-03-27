FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 py3-pip python3-dev build-base

COPY package*.json ./

RUN npm install --registry=https://registry.npmmirror.com

COPY . .

RUN python3 -m venv python-runner/.venv && \
    . python-runner/.venv/bin/activate && \
    pip install --no-cache-dir -r python-runner/requirements.txt

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
