# Use uma imagem base que já tenha Node.js instalado
FROM node:18-alpine

# Instale ffmpeg e ffprobe
RUN apk add --no-cache ffmpeg

# Verifique se os binários foram instalados corretamente
RUN ls -l /usr/bin/ffmpeg /usr/bin/ffprobe

# Crie o diretório de trabalho
WORKDIR /app

# Copie o package.json e package-lock.json
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante do código da aplicação
COPY . .

# Comando para iniciar a aplicação
ENTRYPOINT ["sh", "-c", "npm run process-video --video_name=$VIDEO_NAME"]
