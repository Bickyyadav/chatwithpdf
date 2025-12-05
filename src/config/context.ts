import { Pinecone } from "@pinecone-database/pinecone";
import { removeNonAsciiCharacters } from "./pinecone";
import { getEmbedding } from "./embedding";

//this get the pinecone and return the top 5 similar vector in array
export async function getMatchesFromEmbeddings(
  embedding: number[],
  fileKey: string
) {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY as string,
    });

    const index = await pinecone.Index("chatwithpdf1");
    const nameSpace = index.namespace(removeNonAsciiCharacters(fileKey));
    const response = await nameSpace.query({
      topK: 5,
      vector: embedding,
      includeMetadata: true,
    });
    return response.matches || [];
  } catch (error) {
    console.log("🚀 ~ error:", error);
    throw error;
  }
}

//function to get context to get query
export async function getContext(query: string, fileKey: string) {

  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding) {
  return null;
  }
  const matches = await getMatchesFromEmbeddings(queryEmbedding, fileKey);
  
  type Metadata = {
    text: string;
    pageNumber: number;
  };

  const docs = matches
    .map((match) => match.metadata as Metadata)
    .filter((metadata): metadata is Metadata => Boolean(metadata?.text))
    .map((metadata) => {
      const pageLabel = metadata.pageNumber
        ? `Page ${metadata.pageNumber}`
        : "Unknown page";
      return `${pageLabel}: ${metadata.text}`;
    });

  if (!docs.length) {
    return null;
  }

  return docs.join("\n\n").slice(0, 4000);
}
