import { getContext } from "@/config/context";
import { prisma_client } from "@/config/prismaClient";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.OPEN_AI_KEY!);
type GenerativeModel = ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
type GenerateContentArgs = Parameters<GenerativeModel["generateContent"]>[0];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(
  model: GenerativeModel,
  args: GenerateContentArgs,
  retries = 2
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(args);
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      if (status === 503 && attempt < retries) {
        const delay = 500 * 2 ** attempt;
        console.warn(
          `Gemini overloaded (503). Retry ${attempt + 1} of ${retries} in ${delay}ms.`
        );
        await wait(delay);
        continue;
      }
      break;
    }
  }
  throw lastError ?? new Error("Failed to generate content");
}

const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && typeof (error as { status?: number }).status === "number") {
      return (error as { status: number }).status;
    }
    if (
      "response" in error &&
      typeof (error as { response?: { status?: number } }).response?.status === "number"
    ) {
      return (error as { response: { status: number } }).response.status;
    }
  }
  return undefined;
};

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    // await prisma_client.message.create({
    //   data: {
    //     chat_id: chatId,
    //     content: messages,
    //     role: "user",
    //   },
    // });

    const chat = await prisma_client.chats.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return Response.json("Invalid Chat Id", { status: 404 });
    }

    const fileKey = chat.file_key;
    const latestMessage = messages[messages.length - 1];
    const query = latestMessage?.content;

    if (!query) {
      return Response.json(
        { error: "No user query was provided." },
        { status: 400 }
      );
    }

    // ✅ Ensure only the string content is passed to getContext
    const context = await getContext(query, fileKey);

    if (!context) {
      return Response.json({
        message: [
          {
            role: "assistant",
            content:
              "I couldn't find any relevant information in the uploaded PDF to answer that question. Please try asking about something that appears in the document.",
          },
        ],
      });
    }

    const systemPrompt = {
      role: "user",
      parts: [
        {
          text: `You are an AI assistant that must ONLY answer using the supplied PDF context.
                 Never rely on outside knowledge. If the answer is not in the context, reply with "I'm sorry, but I don't know the answer to that question."
                 Keep responses concise and cite page numbers when available.`,
        },
      ],
    };

    const contextPrompt = {
      role: "user",
      parts: [
        {
          text: `Context from the uploaded PDF:
                 ${context}
                 Do not use any information beyond this context.`,
        },
      ],
    };

    const normalizeRole = (role: string) =>
      role === "assistant" || role === "model" ? "model" : "user";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history = messages.map((msg: any) => ({
      role: normalizeRole(msg.role),
      parts: [{ text: msg.content }],
    }));

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [systemPrompt, contextPrompt, ...history];
    const result = await generateWithRetry(model, { contents });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    // if (text) {
    //   await prisma_client.message.create({
    //     data: {
    //       chat_id: chatId,
    //       content: text,
    //       role: "assistant",
    //     },
    //   });
    // } else {
    //   console.error("No response text from AI model");
    // }

    return Response.json({
      message: [{ role: "assistant", content: text }],
    });
  } catch (error) {
    const status = getErrorStatus(error);
    if (status === 503) {
      return Response.json(
        { error: "The AI model is temporarily overloaded. Please retry shortly." },
        { status: 503 }
      );
    }
    console.error("🚀 ~ POST ~ error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
