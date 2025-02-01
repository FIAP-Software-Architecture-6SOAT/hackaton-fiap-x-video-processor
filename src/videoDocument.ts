export interface VideoDocument {
  fileName: string;
  user: {
    email: string;
  };
  videoPath: {
    key: string;
    bucket: string;
  };
}
