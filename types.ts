export interface Cemetery {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  visited: boolean;
  visitedDate?: string; // ISO String
  history: string;
  dailyFacts?: string; // Cache for the 'Cemetery of the Day' facts
  userNotes: string;
  photos: string[]; // Base64 strings
}

export type CemeteryUpdate = Partial<Cemetery>;