/* eslint-disable no-process-env */
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

import { downloadFromS3 } from './aws';
import { createZip } from './createZip';
import { Logger } from './logger';
import { getDocumentById, updateDocument } from './mongodb';
import { sendEmail } from './sendEmail';
import type { VideoDocument } from './videoDocument';

dotenv.config();

let videoDocument: VideoDocument | null = null;

const processVideo = async (): Promise<void> => {
  Logger.info('Starting video processing...');

  videoDocument = await getDocumentById(process.env.VIDEO_ID as string);
  if (!videoDocument) throw new Error('Video document not found');

  const fileName = videoDocument?.fileName;
  Logger.info('Video file name: %s', fileName);

  const videoName = fileName.replace(/\.[^/.]+$/, '');
  const videoPath = path.join(__dirname, `${videoName}/${fileName}`);
  const outputFolder = path.join(__dirname, `${videoName}/images/`);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  Logger.info('Dowloading video from S3...');
  await downloadFromS3(videoDocument.videoPath.key, videoPath);

  const videoInfo = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, vidInfo) => {
      if (err) {
        reject(new Error('Error analyzing video'));
      } else {
        resolve(vidInfo);
      }
    });
  });

  const { duration } = videoInfo.format as { duration: number };
  const interval = 20;
  let currentTime = 0;

  const processFrame = async (): Promise<void> => {
    if (currentTime >= duration) {
      Logger.info('Video processing finished');
      await createZip(outputFolder, videoName, videoDocument as VideoDocument);
      return;
    }

    Logger.info(`Processing frame: ${currentTime}`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [currentTime],
          filename: `frame_at_${currentTime}.jpg`,
          folder: outputFolder,
          size: '1920x1080',
        })
        .on('end', () => {
          currentTime += interval;
          resolve();
        })
        .on('error', (e) => {
          reject(
            new Error(
              `Error processing frame: ${
                e instanceof Error ? e.message : String(e)
              }`
            )
          );
        });
    });

    await processFrame();
  };

  await processFrame().catch((error) => {
    throw new Error(error instanceof Error ? error.message : String(error));
  });
};

processVideo().catch(async (error) => {
  Logger.error('Error processing video: %s', error);
  await sendEmail(videoDocument as VideoDocument);
  await updateDocument(process.env.VIDEO_ID as string, {
    error:
      error instanceof Error
        ? `Error processing video: ${error.message}`
        : String(error),
    status: 'Erro',
  });
});
