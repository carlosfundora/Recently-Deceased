export interface NotableInterment {
  id: string;
  name: string;
  deathDate: string;
  epitaph: string;
  bio: string;
  photo?: string; // Base64 string for spirit/tombstone photo
}

export interface Cemetery {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  visited: boolean;
  visitedDate?: string; // ISO String
  history: string;
  longHistory?: string;
  founded?: string;
  interments?: string;
  notableInterments?: NotableInterment[];
  dailyFacts?: string; // Cache for the 'Cemetery of the Day' facts
  userNotes: string;
  photos: string[]; // Base64 strings
}

export type CemeteryUpdate = Partial<Cemetery>;