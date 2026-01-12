"use client";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { MessageCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

type Chat = {
  id: string;
  pdf_Name: string;
  pdf_url: string;
  user_id: string;
  file_key: string;
  createdAt: Date;
};

type Props = {
  chats: Chat[];
  chatId: string;
};

const ChatSideBar = ({ chatId, chats }: Props) => {
  console.log("chatsfasdffffffff", chats);

  const [loading, setLoading] = useState(false);
  const handleSubscription = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/lemonSqueezy", {
        productId: 787951,
      });
      console.log("🚀 ~ handleSubscription ~ response:", response);
      window.open(response.data.checkoutUrl, "_blank");
      // window.location.href = response.data.url;
    } catch (error) {
      console.log("🚀 ~ handleSubscrition ~ error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen p-4 text-gray-500 bg-gray-800 flex flex-col overflow-hidden">
      <Link href="">
        <Button className="w-full  border-dashed border-white border">
          <PlusCircle className="mr-2 w-4 h-4" /> New Chat
        </Button>
      </Link>

      <div className="flex flex-col gap-2 mt-4 overflow-y-auto pr-2 flex-1">
        {chats.map((chat) => (
          <Link href="" key={chat.id}>
            <div
              className={cn(
                " rounded-lg p-3 text-slate-300 flex items-center ",
                {
                  "bg-blue-600 text-white": chat.id === chatId,
                  "hover:text-white": chat.id !== chatId,
                }
              )}
            >
              <MessageCircle className="mr-2" />
              <p className="w-full overflow-hidden text-sm truncate whitespace-nowrap">
                {chat.pdf_Name}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-200 flex-wrap">
          <Link href="/">Home</Link>
          <Link href="/">Source</Link>
        </div>
        {/* stripe */}
        <Button
          disabled={loading}
          className="mt-2 text-white bg-slate-500"
          onClick={handleSubscription}
        >
          Upgrade To Pro!
        </Button>
      </div>
    </div>
  );
};

export default ChatSideBar;
