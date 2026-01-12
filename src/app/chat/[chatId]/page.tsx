import ChatComponent from "@/components/ChatComponent";
import ChatSideBar from "@/components/ChatSideBar";
import PDFView from "@/components/PDFView";
import { prisma_client } from "@/config/prismaClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
  params: Promise<{
    chatId: string;
  }>;
};

const chatPage = async ({ params }: Props) => {
  const { chatId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return redirect("/sign-in");
  }

  const getChats = await prisma_client.chats.findMany({
    where: {
      user_id: userId,
    },
  });

  if (!getChats) {
    redirect("/");
  }

  if (!getChats.find((chat: any) => chat.id === chatId)) {
    redirect("/");
  }

  const currentUrl = getChats.find((chat: any) => chat.id === chatId);

  return (
    <div className=" flex max-h-screen overflow-hidden">
      <div className=" flex w-full max-h-screen overflow-hidden">
        <div className=" flex-[1] max-w-xs">
          <ChatSideBar chatId={chatId} chats={getChats} />
        </div>
        <div className=" max-h-screen p-4 overflow-hidden flex-[5]">
          <PDFView pdf_url={currentUrl?.pdf_url || ""} />
        </div>
        <div className=" flex-[3] border-l-4  border-l-slate-200">
          <ChatComponent chatId={chatId} />
        </div>
      </div>
    </div>
  );
};

export default chatPage;
