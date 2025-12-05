/* eslint-disable prefer-const */
import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromCloudinary } from "./cloudinary-server";
//PDFLoader in LangChain is used to extract and convert the content of a PDF file into plain text documents,
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbedding } from "./embedding";
import md5 from "md5";
// import { convertToAscii } from "@/lib/utils";

let pineconeClient: Pinecone | null = null;

export const getPineconeClient = async () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY as string,
    });
  }
  return pineconeClient;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string, resource_type?: string) {
  try {
    //1 obtain the pdf--download and read from pdf
    console.log("downloading s3 into file system");
    const file_name = await downloadFromCloudinary(fileKey, resource_type);
    if (!file_name) {
      throw new Error("could not download from s3");
    }

    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];
    //2. split and segments the pdf into documentation
    //if the page has 13Array after calling the prepareDocument array it may convert into the 100Array
    const document = await Promise.all(
      pages.map((pages) => prepareDocument(pages))
    );
    console.log("🚀 ~ loadS3IntoPinecone ~ document:", document);

    //3. step is vectorize and embedded individual document
    const vectors = await Promise.all(document.flat().map(embedDocument));
    console.log("🚀 ~ loadS3IntoPinecone ~ vectors:", vectors);

    //upload to pinecone
    const client = await getPineconeClient();
    const pineconeIndex = client.Index("chatwithpdf1");
    //remove non ascii character
    const nameSpace = pineconeIndex.namespace(
      removeNonAsciiCharacters(fileKey)
    );
    await nameSpace.upsert(vectors);
    // await pineconeIndex.namespace(namespace).upsert(vectors);
    return document[0];
  } catch (error) {
    console.log("🚀 ~ loadS3IntoPinecone ~ error:", error);
  }
}

//3 step

async function embedDocument(doc: Document) {
  try {
    const embedding = await getEmbedding(doc.pageContent);
    const hash = md5(doc.pageContent);
    return {
      id: hash,
      values: embedding,
      metadata: {
        text: doc.metadata?.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as PineconeRecord;
  } catch (error) {
    throw error;
  }
}

//2.2 rd step is doing if because if the text is more then it is difficult to handle in prepareDocument of pinecone
export const truncateStringByBytes = (str: string, bytes: number) => {
  const encoder = new TextEncoder();
  return new TextDecoder("utf-8").decode(encoder.encode(str).slice(0, bytes));
};

//step 2.1 doing here
async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  //split the text
  const splitter = new RecursiveCharacterTextSplitter();
  //splitter will split into original document into smaller document
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 30000),
      },
    }),
  ]);
  return docs;
}

// async function delay(ms: number) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

export function removeNonAsciiCharacters(fileKey: string) {
  const asciiString = fileKey.replace(/[^\x00-\x7F]+/g, "");

  return asciiString;
}
