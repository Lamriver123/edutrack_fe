import { ClassroomDetailPage } from "@/components/classes/classroom-detail-page";

export default async function ClassDetailRoute({
  params,
}: PageProps<"/classes/[classId]">) {
  const { classId } = await params;

  return <ClassroomDetailPage classId={classId} />;
}
