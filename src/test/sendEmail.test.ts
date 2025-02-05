import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';

import { Logger } from '../logger';
import { sendEmail } from '../sendEmail';
import type { VideoDocument } from '../videoDocument';

jest.mock('../logger', () => ({
  Logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe('sendEmail', () => {
  const mockSend = jest.fn();
  const mockVideoDocument: VideoDocument = {
    user: { email: 'test@example.com' },
    fileName: 'test-video.mp4',
  } as VideoDocument;

  beforeAll(() => {
    jest.spyOn(SESClient.prototype, 'send').mockImplementation(mockSend);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send an email successfully', async () => {
    mockSend.mockResolvedValueOnce({});
    await sendEmail(mockVideoDocument);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    expect(Logger.info).toHaveBeenCalledWith('Email sent successfully');
  });

  it('should log an error if sending email fails', async () => {
    const error = new Error('Failed to send email');
    mockSend.mockRejectedValueOnce(error);

    await sendEmail(mockVideoDocument);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    expect(Logger.error).toHaveBeenCalledWith('Error sending email: %s', error);
  });
});
