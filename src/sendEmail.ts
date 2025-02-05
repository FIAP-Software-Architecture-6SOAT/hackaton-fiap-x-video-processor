/* eslint-disable no-process-env */
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';

import { Logger } from './logger';
import type { VideoDocument } from './videoDocument';

dotenv.config();

const client = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES as string,
  },
});

export const sendEmail = async (videoDocument: VideoDocument): Promise<void> => {
  const params = {
    Destination: {
      ToAddresses: [videoDocument.user.email],
    },
    Message: {
      Body: {
        Text: {
          Data: `Erro ao processar o vídeo: ${videoDocument.fileName}. Envie o vídeo novamente e se o problema persistir entre em contato com o suporte.`,
        },
      },
      Subject: { Data: `Erro ao processar vídeo: ${videoDocument.fileName}` },
    },
    Source: 'fiapxsuporte@gmail.com',
  };

  try {
    const command = new SendEmailCommand(params);
    await client.send(command);
    Logger.info('Email sent successfully');
  } catch (err) {
    Logger.error('Error sending email: %s', err);
  }
};
