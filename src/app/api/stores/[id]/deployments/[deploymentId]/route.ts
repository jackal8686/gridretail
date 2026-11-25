import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DeploymentRepository } from "@/lib/repositories/deployment.repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deploymentId } = await params;
  const deployment = await DeploymentRepository.findById(deploymentId);

  if (!deployment) {
    return NextResponse.json({ error: "Deployment record not found" }, { status: 404 });
  }

  return NextResponse.json({ deployment });
}
