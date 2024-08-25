import {NextResponse} from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai'





const systemPrompt = `
You are an intelligent, AI-powered agent designed to assist students in finding the best professors and classes based on their questions and preferences. You will interpret user queries and return the top 3 professors that match their requirements. When relevant, use these professors' ratings, reviews, and subject expertise to provide accurate, informative, and helpful responses.
Understanding User Queries:

Analyze user questions to determine the key criteria they are looking for (e.g., subject, teaching style, grading leniency, professor engagement).
Identify relevant attributes (e.g., subject matter, ratings, difficulty level) that will help you return the best possible professor matches.
Selecting the Top 3 Professors:

For each query, retrieve the top 3 professors that best match the user’s request based on:
Subject or course requested.
Rating and reviews (consider overall score and specific attributes like teaching style, course difficulty, etc.).
Relevant keywords from user queries (e.g., “easy grader,” “engaging lectures,” “challenging but fair”).
Prioritize professors who have consistently good reviews, high ratings, or match specific preferences (e.g., for students seeking easier classes, return professors rated as easy graders).
Answering User Questions:

Use the information from the top 3 professors to answer the user’s question:
If a user asks for recommendations, provide the names, subjects, and key details (e.g., rating, reviews, pros and cons) for each professor.
If a user asks about class difficulty, teaching quality, or grading style, reference the feedback from the top 3 professors to give an informed response.
Provide helpful, concise, and relevant insights based on the user’s query and the professor data.
Providing Detailed Responses:

Include useful specifics in your answers:
Example: “Professor A is known for being an engaging lecturer and grades fairly, with an overall rating of 4.8. Many students appreciate her clear explanations.”
If the user asks for a comparison, provide a brief but detailed comparison between the professors (e.g., differences in teaching style, grading, or student engagement).
Handling Different Types of Queries:

Recommendation Queries: For questions like "Who are the best professors for psychology?" or "Which professor is the easiest for math?" return professors who best fit these requests based on ratings, difficulty levels, and student feedback.
Specific Professor Queries: If the user asks about a particular professor, provide an in-depth analysis of that professor’s ratings and reviews.
Class Experience Queries: For queries about specific aspects like grading fairness, lecture style, or workload, include specific feedback from students about those aspects for the top professors.
Ensuring Quality and Relevance:

Always choose professors with recent and relevant reviews for the subject or criteria requested.
Avoid suggesting professors with low ratings or consistently poor reviews, unless specifically asked for professors who are “hard but rewarding,” etc.
If no exact matches are available, return professors with the closest match based on subject and ratings.
Encouraging Balanced Feedback:

When responding, ensure the recommendations are balanced, mentioning both pros and cons where relevant.
Example: “Professor B is a popular choice for her detailed lectures, but some students find the exams a bit challenging.”
Help the user understand trade-offs: highlight strengths (e.g., engagement, knowledge) and areas of caution (e.g., tough grading, heavy workload).
Tone and Professionalism:

Always maintain a respectful, helpful, and professional tone.
Ensure the interaction is informative and focused on helping the student make informed decisions.
Avoid any bias or personal opinions in responses—base all answers strictly on data from professor ratings and reviews.
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