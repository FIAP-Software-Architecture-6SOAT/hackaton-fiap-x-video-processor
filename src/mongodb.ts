/* eslint-disable no-process-env */
import { MongoClient, ObjectId } from 'mongodb';

import { Logger } from './logs/logger';

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING as string);

export const updateDocument = async (
  collectionName: string,
  documentId: string,
  update: object
): Promise<void> => {
  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DB_NAME as string);
    const collection = database.collection(collectionName);

    const result = await collection.updateOne(
      { _id: new ObjectId(documentId) },
      { $set: update }
    );

    if (result.matchedCount > 0) {
      Logger.info('Document updated successfully.');
    } else {
      Logger.info('No document found with the given ID.');
    }
  } catch (err) {
    Logger.error('Error updating document: %s', err);
  } finally {
    await client.close();
  }
};
