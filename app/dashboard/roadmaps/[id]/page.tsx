// app/dashboard/roadmaps/[id]/page.tsx
import RoadmapTracker from '../../../../components/RoadmapTracker';

export default async function RoadmapTrackerPage(props: any) {
  const { id } = await (props as any).params;
  return <RoadmapTracker roadmapId={id} />;
}
