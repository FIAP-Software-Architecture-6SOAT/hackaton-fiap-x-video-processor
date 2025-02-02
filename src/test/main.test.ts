import { jest } from '@jest/globals';
import ffmpeg from 'fluent-ffmpeg';

import { downloadFromS3 } from '../aws';
import { createZip } from '../createZip';
import { Logger } from '../logger';
import { processVideo } from '../main';
import { getDocumentById } from '../mongodb';
import type { VideoDocument } from '../videoDocument';

jest.mock('fluent-ffmpeg');
jest.mock('fs');
jest.mock('@smithy/shared-ini-file-loader', () => ({
  loadSharedConfigFiles: jest.fn(),
}));
jest.mock('@smithy/property-provider', () => ({
  coalesceProvider: jest.fn(),
}));
jest.mock('@smithy/node-config-provider', () => ({
  loadConfig: jest.fn(),
}));
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(),
  SendEmailCommand: jest.fn(),
}));
jest.mock('../mongodb', () => ({
  getDocumentById: jest.fn(),
  updateDocument: jest.fn(),
}));
jest.mock('../sendEmail');
jest.mock('../logger');
jest.mock('../aws', () => ({
  downloadFromS3: jest.fn(),
}));
jest.mock('../createZip');

describe('processVideo', () => {
  beforeAll(() => {
    jest
      .spyOn({ downloadFromS3 }, 'downloadFromS3')
      .mockResolvedValue(undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process video successfully', async () => {
    (
      getDocumentById as jest.MockedFunction<typeof getDocumentById>
    ).mockResolvedValue({
      fileName: 'test.mp4',
      videoPath: { key: 'test-key' },
    } as VideoDocument);
    (ffmpeg.ffprobe as jest.Mock).mockImplementation((path, callback) => {
      (
        callback as (
          err: Error | null,
          data: { format: { duration: number } }
        ) => void
      )(null, { format: { duration: 60 } });
    });
    (ffmpeg as unknown as jest.Mock).mockReturnValue({
      screenshots: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'end') {
          callback();
        }
        return this;
      }),
    });
    (createZip as jest.Mock).mockResolvedValue(undefined as never);

    await processVideo();

    expect(downloadFromS3).toHaveBeenCalled();
    expect(Logger.info).toHaveBeenCalledWith('Starting video processing...');
    expect(Logger.info).toHaveBeenCalledWith('Video processing finished');
    expect(createZip).toHaveBeenCalled();
  });

  it('should handle errors during video processing', async () => {
    (
      getDocumentById as jest.MockedFunction<typeof getDocumentById>
    ).mockResolvedValue(null);

    await expect(processVideo()).rejects.toThrow('Video document not found');
  });
});
