import { router } from 'expo-router';

import { SegmentForm } from '@/components/SegmentForm';
import { useSegments } from '@/hooks/useSegments';

// Story 1.2: Create a Named Practice Segment (FR1).
export default function NewSegmentScreen() {
  const { createSegment } = useSegments();

  const handleSubmit = (name: string) => {
    createSegment(name);
    router.replace('/');
  };

  return <SegmentForm submitLabel="Create" onSubmit={handleSubmit} />;
}
