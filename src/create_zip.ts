/* eslint-disable @typescript-eslint/no-floating-promises */
import archiver from 'archiver';
import * as fs from 'fs';

import { uploadToS3 } from './aws_s3';
import { Logger } from './logs/logger';

export const createZip = async (
  outputFolder: string,
  imagesZipPath: string,
  imagesZipKey: string,
  videoFolder: string
): Promise<void> => {
  const output = fs.createWriteStream(imagesZipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  output.on('close', () => {
    Logger.info('Images zip created successfully');
    uploadToS3(imagesZipPath, imagesZipKey, videoFolder);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(outputFolder, false);
  await archive.finalize();
};
