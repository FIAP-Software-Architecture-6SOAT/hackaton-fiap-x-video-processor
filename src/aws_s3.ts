/* eslint-disable no-process-env */
import '@aws-sdk/crc64-nvme-crt';

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { videoFolder } from '.';
import { Logger } from './logs/logger';
import { deleteFolder } from './utils';

const pipelineAsync = promisify(pipeline);

const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    sessionToken: process.env.AWS_SESSION_TOKEN as string,
  },
});

export const downloadFromS3 = async (
  bucketName: string,
  key: string,
  downloadPath: string
): Promise<void> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await s3Client.send(command);

    if (response.Body) {
      await pipelineAsync(response.Body, fs.createWriteStream(downloadPath));
      Logger.info(`File downloaded successfully to ${downloadPath}`);
    } else {
      Logger.error('No data found in S3 response');
    }
  } catch (err) {
    Logger.error('Error downloading file from S3: %s', err);
  }
};

export const uploadToS3 = async (
  filePath: string,
  bucketName: string,
  key: string
): Promise<void> => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
    });
    await s3Client.send(command);
    Logger.info('File uploaded successfully.');

    // Delete the video folder after upload
    deleteFolder(videoFolder);
  } catch (err) {
    Logger.error('Error uploading file to S3: %s', err);
  }
};
