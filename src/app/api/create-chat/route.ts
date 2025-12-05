import { loadS3IntoPinecone } from "@/config/pinecone";
import { prisma_client } from "@/config/prismaClient";
import { getCloudinaryUrl } from "@/config/cloudinary";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  console.log("🟢🟢🟢🟢🟢 ~ POST ~ userId:", userId)
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { file_key, file_name, resource_type } = body;
    console.log("🟢🟢🟢🟢🟢 ~ POST ~ file_name:", file_name)
    console.log("🟢🟢🟢🟢🟢 ~ POST ~ file_key:", file_key)
    await loadS3IntoPinecone(file_key, resource_type);
    const createChat = await prisma_client.chats.create({
      data: {
        pdf_Name: file_name,
        pdf_url: getCloudinaryUrl(file_key, resource_type),
        file_key: file_key,
        user_id: userId,
      },

      select: {
        id: true,
      },
    });
    return NextResponse.json(
      { message: "Success", chat_id: createChat.id },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.log("🚀 ~ POST ~ error:", error);
    return NextResponse.json({ error: "Internal server error", status: 500 });
  }
}
