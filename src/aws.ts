/* eslint-disable no-process-env */
import '@aws-sdk/crc64-nvme-crt';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import * as fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { Logger } from './logger';
import { updateDocument } from './mongodb';
import { sendEmail } from './sendEmail';
import type { VideoDocument } from './videoDocument';

dotenv.config();

const pipelineAsync = promisify(pipeline);

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    sessionToken: process.env.AWS_SESSION_TOKEN as string,
  },
});

export const downloadFromS3 = async (key: string, downloadPath: string): Promise<void> => {
  try {
    const BUCKET = process.env.BUCKET_VIDEOS_NAME;
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    const response = await s3Client.send(command);

    if (response.Body) {
      await pipelineAsync(
        response.Body as unknown as NodeJS.ReadableStream,
        fs.createWriteStream(downloadPath)
      );
      Logger.info(`File downloaded successfully`);
    } else {
      Logger.error('No data found in S3 response');
    }
  } catch (error) {
    Logger.error('Error downloading file from S3: %s', error);
    throw new Error(
      error instanceof Error ? `Error downloading file from S3: ${error.message}` : String(error)
    );
  }
};

export const uploadToS3 = async (
  filePath: string,
  key: string,
  videoDocument: VideoDocument
): Promise<void> => {
  const BUCKET = process.env.BUCKET_IMAGES_ZIP_NAME;
  try {
    const fileContent = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileContent,
    });
    await s3Client.send(command);
    Logger.info('File uploaded successfully');

    // Update the document in MongoDB
    await updateDocument(process.env.VIDEO_ID as string, {
      imagesZipPath: {
        key,
        bucket: BUCKET,
      },
      status: 'Concluído',
    });
  } catch (error) {
    Logger.error('Error uploading file to S3: %s', error);
    await sendEmail(videoDocument);
    await updateDocument(process.env.VIDEO_ID as string, {
      error:
        error instanceof Error ? `Error uploading file to S3: ${error.message}` : String(error),
      status: 'Erro',
    });
  }
};
