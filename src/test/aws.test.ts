/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-process-env */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { pipeline } from 'stream';
import { promisify } from 'util';

import { downloadFromS3, uploadToS3 } from '../aws';
import { Logger } from '../logger';
import { updateDocument } from '../mongodb';
import { sendEmail } from '../sendEmail';
import type { VideoDocument } from '../videoDocument';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn().mockResolvedValue('file content'),
  },
  readFileSync: jest.fn().mockReturnValue('file content'),
  createWriteStream: jest.fn(),
}));
jest.mock('stream');
jest.mock('@aws-sdk/crc64-nvme-crt');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(),
  SendEmailCommand: jest.fn(),
}));
jest.mock('@smithy/shared-ini-file-loader', () => ({
  loadSharedConfigFiles: jest.fn(),
}));
jest.mock('@smithy/property-provider', () => ({
  coalesceProvider: jest.fn(),
}));
jest.mock('@smithy/node-config-provider', () => ({
  loadConfig: jest.fn(),
}));
jest.mock('../logger', () => ({
  Logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../mongodb', () => ({
  updateDocument: jest.fn(),
}));
jest.mock('../sendEmail');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn((fn) => fn),
}));

const mockPipeline = promisify(pipeline) as jest.Mock;

const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;

describe('AWS S3 Operations', () => {
  const mockVideoDocument: VideoDocument = {
    user: { email: 'test@example.com' },
    fileName: 'test-video.mp4',
  } as VideoDocument;

  const videoId = '123';
  process.env.BUCKET_IMAGES_ZIP_NAME = 'imageszip';
  process.env.VIDEO_ID = videoId;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('downloadFromS3', () => {
    it('should download a file from S3 successfully', async () => {
      const mockResponse = {
        Body: {
          pipe: jest.fn(),
        },
      };

      mockS3Client.prototype.send = jest.fn().mockImplementation((command) => {
        if (command instanceof GetObjectCommand) {
          return mockResponse;
        }
        return {};
      });

      await downloadFromS3('test-key', '/mock/download/path');

      expect(mockS3Client.prototype.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand)
      );
      expect(mockPipeline).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('File downloaded successfully');
    });

    it('should handle errors during file download', async () => {
      (S3Client.prototype.send as jest.Mock).mockReturnValue(
        Promise.reject(new Error('S3 error'))
      );

      await expect(
        downloadFromS3('test-key', '/mock/download/path')
      ).rejects.toThrow('Error downloading file from S3: S3 error');

      expect(Logger.error).toHaveBeenCalledWith(
        'Error downloading file from S3: %s',
        expect.any(Error)
      );
    });
  });

  describe('uploadToS3', () => {
    it('should upload a file to S3 successfully', async () => {
      (S3Client.prototype.send as jest.Mock).mockReturnValue(
        Promise.resolve(undefined)
      );
      (updateDocument as jest.Mock).mockResolvedValue(undefined);

      await uploadToS3('/mock/file/path', 'test-key', mockVideoDocument);

      expect(S3Client.prototype.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand)
      );
      expect(Logger.info).toHaveBeenCalledWith('File uploaded successfully');
      expect(updateDocument).toHaveBeenCalledWith(videoId, {
        imagesZipPath: {
          key: 'test-key',
          bucket: 'imageszip',
        },
        status: 'Concluído',
      });
    });

    it('should handle errors during file upload', async () => {
      (S3Client.prototype.send as jest.Mock).mockReturnValue(
        Promise.reject(new Error('S3 error'))
      );
      (sendEmail as jest.Mock).mockResolvedValue(undefined);
      (updateDocument as jest.Mock).mockResolvedValue(undefined);

      await uploadToS3('/mock/file/path', 'test-key', mockVideoDocument);

      expect(Logger.error).toHaveBeenCalledWith(
        'Error uploading file to S3: %s',
        expect.any(Error)
      );
      expect(sendEmail).toHaveBeenCalledWith(mockVideoDocument);
      expect(updateDocument).toHaveBeenCalledWith(videoId, {
        error: 'Error uploading file to S3: S3 error',
        status: 'Erro',
      });
    });
  });
});
