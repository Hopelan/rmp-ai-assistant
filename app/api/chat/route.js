import {NextResponse} from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai'

import fetch from 'node-fetch';

if (!global.fetch) {
  global.fetch = fetch;
}

const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey:process.env.PINECONE_API_KEY,
    })

    
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    //process user query
    const text = data[data.length-1].content
    const embedding = await openai.embeddings.create({
        model:'text-embedding-3-small',
        input:text,
        encoding_format:'float',
    })

    //use the embedding to query pinecone and return similar reviews
    const results = await index.query({
        topK:5,
        includeMetadata:true,
        vector:embedding.data[0].embedding,
    })

    //putting the pinecone results into a readable string
    let resultString = ''
    results.matches.forEach((match) => {
        resultString += `
        Returned Results:
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`
    })
    
    console.log(resultString)

    //combine user message with results from pinecone
    const lastMessage = data[data.length-1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length-1)

    //sending request to OpenAI
    const completion = await openai.chat.completions.create({
        messages: [
            {role:'system', content:systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent},
        ],
        model: 'gpt-3.5-turbo',
        stream: true,
    })

    //setup streaming response
    const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content
              if (content) {
                const text = encoder.encode(content)
                controller.enqueue(text)
              }
            }
          } catch (err) {
            controller.error(err)
          } finally {
            controller.close()
          }
        },
      })
    

    return new NextResponse(stream)
}