import * as fs from 'fs';
import * as path from 'path';

import { Logger } from './logs/logger';

export const clearOutputFolder = (folderPath: string): void => {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const filePath = path.join(folderPath, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

export const deleteFolder = (folderPath: string): void => {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true });
    Logger.info(`Folder ${folderPath} deleted`);
  }
};
