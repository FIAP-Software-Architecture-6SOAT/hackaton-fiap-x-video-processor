/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-process-env */
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

import { downloadFromS3, uploadToS3 } from './aws_s3';
import { createZip } from './create_zip';
import { Logger } from './logs/logger';
import { clearOutputFolder } from './utils';

Logger.info('Starting video processing...');

const videoFullName = process.env.VIDEO_NAME as string;
Logger.info('Video full name: %s', videoFullName);

const videoName = videoFullName.split('.').slice(0, -1).join('.');
const videoPath = path.join(__dirname, videoFullName);
const imagesZipPath = path.join(__dirname, `${videoName}/images.zip`);
const outputFolder = path.join(__dirname, `${videoName}/images/`);
export const videoFolder = path.join(__dirname, videoName);

const processVideo = async (): Promise<void> => {
  const bucketName = 'processvideos';
  const key = videoFullName;

  Logger.info('Dowloading video from S3...');
  await downloadFromS3(bucketName, key, videoPath);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  } else {
    clearOutputFolder(outputFolder);
  }

  ffmpeg.ffprobe(videoPath, (err, videoInfo) => {
    if (err) {
      Logger.error('Error analyzing video: %s', err);
      return;
    }

    const { duration } = videoInfo.format;
    if (!duration) {
      Logger.error('Error: video duration is undefined');
      return;
    }
    const interval = 20; // seconds

    let currentTime = 0;

    const processFrame = async (): Promise<void> => {
      if (currentTime >= duration) {
        Logger.info('Video processing finished');
        await createZip(outputFolder, imagesZipPath);
        await uploadToS3(imagesZipPath, 'imageszip', `${videoName}_images.zip`);
        return;
      }

      Logger.info(`Processing frame: ${currentTime}`);

      ffmpeg(videoPath)
        .screenshots({
          timestamps: [currentTime],
          filename: `frame_at_${currentTime}.jpg`,
          folder: outputFolder,
          size: '1920x1080',
        })
        .on('end', () => {
          currentTime += interval;
          processFrame();
        })
        .on('error', (e) => {
          Logger.error('Error processing frame: %s', e);
        });
    };

    processFrame();
  });
};

processVideo().catch(Logger.error);
