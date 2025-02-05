import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

import { uploadToS3 } from '../aws';
import { createZip } from '../createZip';
import { Logger } from '../logger';
import type { VideoDocument } from '../videoDocument';

jest.mock('fs');
jest.mock('archiver');
jest.mock('../logger', () => ({
  Logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock('../aws', () => ({
  uploadToS3: jest.fn(),
}));

describe('createZip', () => {
  const mockOutputFolder = '/mock/output/folder';
  const mockVideoName = 'test-video';
  const mockVideoDocument: VideoDocument = {
    user: { email: 'test@example.com' },
    fileName: 'test-video.mp4',
  } as VideoDocument;
  const pathDirname = __dirname.replace('src/test', 'src');

  const mockCreateWriteStream = jest.fn();
  const mockArchive = {
    pipe: jest.fn(),
    directory: jest.fn(),
    finalize: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeAll(() => {
    (fs.createWriteStream as jest.Mock).mockImplementation(
      mockCreateWriteStream
    );
    (archiver as unknown as jest.Mock).mockImplementation(() => mockArchive);
    jest.spyOn({ uploadToS3 }, 'uploadToS3').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a zip file and upload it to S3', async () => {
    const mockOutput = {
      on: jest.fn((event: string, callback: () => void) => {
        callback();
      }),
    };
    mockCreateWriteStream.mockReturnValue(mockOutput);

    await createZip(mockOutputFolder, mockVideoName, mockVideoDocument);

    expect(fs.createWriteStream).toHaveBeenCalledWith(
      path.join(pathDirname, `${mockVideoName}/images.zip`)
    );
    expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutput);
    expect(mockArchive.directory).toHaveBeenCalledWith(mockOutputFolder, false);
    expect(mockArchive.finalize).toHaveBeenCalled();
    expect(Logger.info).toHaveBeenCalledWith('Images zip created successfully');
    expect(uploadToS3).toHaveBeenCalledWith(
      path.join(pathDirname, `${mockVideoName}/images.zip`),
      `${mockVideoName}_images.zip`,
      mockVideoDocument
    );
  });

  it('should log an error if archiving fails', async () => {
    const mockError = new Error('Archiving failed');
    mockArchive.finalize.mockRejectedValueOnce(mockError);

    await expect(
      createZip(mockOutputFolder, mockVideoName, mockVideoDocument)
    ).rejects.toThrow(mockError);
  });
});
