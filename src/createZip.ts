/* eslint-disable @typescript-eslint/no-floating-promises */
import archiver from 'archiver';
import * as fs from 'fs';
import path from 'path';

import { uploadToS3 } from './aws';
import { Logger } from './logger';
import type { VideoDocument } from './videoDocument';

export const createZip = async (
  outputFolder: string,
  videoName: string,
  videoDocument: VideoDocument
): Promise<void> => {
  const fileZipPath = path.join(__dirname, `${videoName}/images.zip`);
  const imagesZipKey = `${videoName}_images.zip`;

  const output = fs.createWriteStream(fileZipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  output.on('close', () => {
    Logger.info('Images zip created successfully');
    uploadToS3(fileZipPath, imagesZipKey, videoDocument);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(outputFolder, false);
  await archive.finalize();
};
