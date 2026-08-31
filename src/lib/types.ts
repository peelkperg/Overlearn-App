// Shared type definitions for the data layer. Per architecture.md's
// Format Patterns: camelCase fields, ISO 8601 date strings, native booleans.

export interface Segment {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string; // ISO 8601
}
