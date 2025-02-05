/* eslint-disable no-process-env */
import dotenv from 'dotenv';
import type { Collection } from 'mongodb';
import { MongoClient, ObjectId } from 'mongodb';

import { Logger } from './logger';
import type { VideoDocument } from './videoDocument';

dotenv.config();
const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING as string);

const getCollection = async (): Promise<Collection> => {
  await client.connect();
  const database = client.db(process.env.MONGODB_DB_NAME as string);
  return database.collection('videos');
};

export const updateDocument = async (documentId: string, update: object): Promise<void> => {
  try {
    const collection = await getCollection();
    const result = await collection.updateOne({ _id: new ObjectId(documentId) }, { $set: update });

    if (result.matchedCount > 0) {
      Logger.info('Video document updated successfully');
    } else {
      Logger.info('No document found with the given ID');
    }
  } catch (err) {
    Logger.error('Error updating document: %s', err);
  } finally {
    await client.close();
  }
};

export const getDocumentById = async (videoId: string): Promise<VideoDocument | null> => {
  try {
    const collection = await getCollection();

    const documents = await collection
      .aggregate<VideoDocument>([
        { $match: { _id: new ObjectId(videoId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
      ])
      .project({ fileName: 1, videoPath: 1, 'user.email': 1 })
      .toArray();

    if (documents.length > 0) {
      Logger.info('Video document retrieved successfully');
      return documents[0] as VideoDocument;
    }
    Logger.info('No video document found with the given ID');
    return null;
  } catch (err) {
    Logger.error('Error retrieving video document: %s', err);
    return null;
  } finally {
    await client.close();
  }
};
