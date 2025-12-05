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
    const query = messages[messages.length - 1]?.content;

    // ✅ Ensure only the string content is passed to getContext
    const context = await getContext(query, fileKey);

    const systemPrompt = {
      role: "user",
      parts: [
        {
          text: `AI assistant is a brand new, powerful, human-like artificial intelligence.
                 The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
                 AI is a well-behaved and well-mannered individual.
                 AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
                 AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
                 AI assistant is a big fan of Pinecone and Vercel.
                 START CONTEXT BLOCK
                 ${context}
                 END OF CONTEXT BLOCK
                 AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
                 If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
                 AI assistant will not apologize for previous responses, but instead will indicate new information was gained.
                 AI assistant will not invent anything that is not drawn directly from the context.`,
        },
      ],
    };

    const normalizeRole = (role: string) =>
      role === "assistant" ? "model" : "user";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history = messages.map((msg: any) => ({
      role: normalizeRole(msg.role),
      parts: [{ text: msg.content }],
    }));

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [systemPrompt, ...history];
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
