import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
    runtime: "edge",
};
  

export default async function handler(req) {
    try {
        const { chatId: chatIdFromParam, message } = await req.json();
        // validate message data
        if (!message || typeof message !== "string" || message.length > 200) {
            return new Response(
                {
                message: "message is required and must be less than 200 characters",
                },
                {
                status: 422,
                }
            );
        }
        let chatId = chatIdFromParam;
        const initialChatMessage = {
            role: "system",
            content:
              "Your name is Casper. An incredibly intelligent and quick-thinking AI, that always replies with an enthusiastic and positive energy. Your response must be formatted as markdown. Only respond based on the context I give you and nothing outside that context. Also there can be history associated with it so please use that.",
        };

        let newChatId;
        let chatMessages = [];
        

        if(chatId) {
            const response = await fetch(`${req.headers.get("origin")}/api/chat/addMessageToChat`, {
                method: "POST",
                headers: {
                    'content-type': 'application/json',
                    cookie: req.headers.get("cookie")
                },
                body: JSON.stringify({ 
                    chatId,
                    role: "user",
                    content: message,
                }),
            });
            const json = await response.json();
            chatMessages = json.chat.messages || [];
        } else {
            const response = await fetch(`${req.headers.get("origin")}/api/chat/createNewChat`, {
                method: "POST",
                headers: {
                    'content-type': 'application/json',
                    cookie: req.headers.get("cookie")
                },
                body: JSON.stringify({ 
                    message,
                }),
            });
            const json = await response.json();
            chatId = json._id;
            newChatId = json._id;
            chatMessages = json.messages || [];
        }

        const messagesToInclude = [];
        chatMessages.reverse();
        let usedTokens = 0;
        for (let chatMessage of chatMessages) {
            const messageTokens = chatMessage.content.length / 4;
            usedTokens = usedTokens + messageTokens;
            if (usedTokens <= 2000) {
                messagesToInclude.push(chatMessage);
            } else {
                break;
            }
        }

        messagesToInclude.reverse();

        const responseFromNewEndpoint = await fetch("https://chatservice-juzqocjfea-uw.a.run.app/chat", {
            method: "POST",
            headers: {
                'content-type': 'application/json',
                // Add any required headers here
            },
            body: JSON.stringify({
                chatId: chatId,
                role: "user",
                userId: "arjunnair9392@gmail.com",
                query: [initialChatMessage, ...messagesToInclude]
            }),
        });
        if (!responseFromNewEndpoint.ok) {
            throw new Error("Failed to fetch data from the new endpoint");
        }

        // Assuming the response is JSON, you can parse it
        const responseData = await responseFromNewEndpoint.json();
        const res = {
            event: 'message',
            content: responseData, // Populate the content property with the intended message content
        };


        // After receiving the response from the new endpoint
        let newChatIdData = null;
        if (newChatId) {
            // Prepare newChatIdData to be sent with the response
            newChatIdData = {
                content: newChatId,
                event: "newChatId"
            };
        }

        // After processing the response, if needed
        await fetch(`${req.headers.get("origin")}/api/chat/addMessageToChat`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: req.headers.get("cookie"),
            },
            body: JSON.stringify({
                chatId,
                role: "assistant",
                content: responseData, // Assuming responseData contains necessary data
            }),
        });
        // Return appropriate response
        return new Response(JSON.stringify({ ...res, newChatIdData }), {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // const stream = await OpenAIEdgeStream (
        //     "https://api.openai.com/v1/chat/completions", {
        //         headers: {
        //             'content-type': 'application/json',
        //             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        //         },
        //         method: "POST",
        //         body: JSON.stringify({
        //             model: "gpt-3.5-turbo",
        //             messages: [initialChatMessage, ...messagesToInclude],
        //             stream: true,
        //         })
        //     }, 
        //     {
        //         onBeforeStream: ({emit}) => {
        //             if(newChatId) {
        //                 emit(newChatId, "newChatId");
        //             }
        //         },
        //         onAfterStream: async({ fullContent }) => {
        //             await fetch(
        //                 `${req.headers.get("origin")}/api/chat/addMessageToChat`,
        //                 {
        //                   method: "POST",
        //                   headers: {
        //                     "content-type": "application/json",
        //                     cookie: req.headers.get("cookie"),
        //                   },
        //                   body: JSON.stringify({
        //                     chatId,
        //                     role: "assistant",
        //                     content: fullContent,
        //                   }),
        //                 }
        //               );
        //         },
        //     }
        // );
        // return new Response(responseData);
    } catch(e){
        return new Response(
            { message: "An error occurred in sendMessage" },
            {
              status: 500,
            }
        );
    }
}