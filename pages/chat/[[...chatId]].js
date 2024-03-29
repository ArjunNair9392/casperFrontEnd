import { ChatSidebar } from "components/ChatSidebar";
import { Message } from "components/Message";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { v4 as uuid } from 'uuid';
import Head from "next/head";
import { getSession } from "@auth0/nextjs-auth0";
import { faRobot, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";

export default function ChatPage({ chatId, title, messages = [] }) {
    
    const [newChatId, setNewChatId] = useState(null);
    const [messageText, setMessageText] = useState("");
    const [incomingMessage, setIncomingMessage] = useState("");
    const [newChatMessages, setNewChatMessages] = useState([]);
    const [generatingResponse, setGeneratingResponse] = useState(false);
    const [fullMessage, setFullMessage] = useState("");
    const [originalChatId, setOriginalChatId] = useState(chatId);
    const router = useRouter();

    const routeHasChanged = chatId !== originalChatId;

    // when our route changes
    useEffect(() => {
        setNewChatMessages([]);
        setNewChatId(null);
    },[chatId]);

    // save the newly streamed message to new chat messages
    useEffect(() => {
        if (!routeHasChanged && !generatingResponse && fullMessage) {
            setNewChatMessages((prev) => [
                ...prev,
                {
                _id: uuid(),
                role: "assistant",
                content: fullMessage,
                isNew: true, // Mark the message as new
                },
            ]);
            setFullMessage("");
        }
    }, [generatingResponse, fullMessage, routeHasChanged]);

    // if we've created a new chat
    useEffect(() => {
    if(!generatingResponse && newChatId) {
        setNewChatId(null);
        setNewChatMessages([]);
        router.push(`/chat/${newChatId}`);
    }
    }, [newChatId, generatingResponse, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (messageText==""){
            return;
        }
        setGeneratingResponse(true);
        setOriginalChatId(chatId);
        setNewChatMessages((prev) => {
            const newChatMessages = [
                ...prev,
                {
                    _id: uuid(),
                    role: "user",
                    content: messageText,
                },
            ];
            return newChatMessages;
        });
        setMessageText("");

        const response =  await fetch(`/api/chat/sendMessage`, {
            method: "POST",
            headers: {
            'content-type': 'application/json'
            },
            body: JSON.stringify({ chatId, message: messageText })
        });
        if (!response.ok) {
            throw new Error("Failed to send message");
        }

        const reader = response.body.getReader();
        let content = "";

        // Create a TextDecoder to decode the received chunk as text
        const decoder = new TextDecoder();

        // Define a function to read the stream
        const readStream = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    // Decode the received chunk as text
                    const decodeChunk = decoder.decode(value, { stream: true });

                    let message = JSON.parse(decodeChunk);
                    // Process the decoded chunk as needed
                    if(typeof message !== "undefined" && message.newChatIdData && message.newChatIdData.event === "newChatId") {
                        setNewChatId(message.newChatIdData.content);
                    } 
                    if(typeof message !== "undefined" && message.event=="message") {
                        setIncomingMessage((s) => `${s}${message.content}`);
                        content = content + message.content;
                        setFullMessage(content);
                        setIncomingMessage("");
                        setGeneratingResponse(false);
                    }
                }
            } catch (error) {
                console.error('Error reading stream:', error);
            }
        };

        readStream();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault(); // Prevent the default behavior of adding a new line
            handleSubmit(e); // Submit the form
        }
    };
    const allMessages = [...messages, ...newChatMessages];
  
  return (
    <>
        <Head>
            <title>New chat</title>
        </Head>
        <div className="grid h-screen grid-cols-[260px_1fr]">
            <ChatSidebar chatId={chatId}/>
            <div className="bg-gray-700 flex flex-col overflow-hidden">
                <div className="chat-scrollbar  flex-1 flex flex-col-reverse text-white overflow-y-scroll overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                    {!allMessages.length && !incomingMessage && (
                        <div className="m-auto flex items-center justify-center text-center">
                            <div>
                            <FontAwesomeIcon
                                icon={faRobot}
                                className="text-6xl text-emerald-200"
                            />
                            <h1 className="mt-2 text-4xl font-bold text-white/50">
                                Ask me a question!
                            </h1>
                            </div>
                        </div>
                        )}
                    {!!allMessages.length && (
                        <div className="mb-auto">
                            {allMessages.map((message) => (
                                <Message
                                    key={message._id}
                                    role={message.role}
                                    content={message.content}
                                    isNew={message.isNew}
                                />
                            ))}
                            {!!incomingMessage && !routeHasChanged && (
                                <Message role="assistant" content={incomingMessage} />
                            )}
                            {!!incomingMessage && !!routeHasChanged && (
                                <Message
                                    role="notice"
                                    content="Only one message at a time. Please allow any other responses to complete before sending another message"
                                />
                            )}
                        </div>
                    )}
                </div>
                <footer className="bg-gray-800 p-6">
                    <form onSubmit={handleSubmit} className="relative">
                        <fieldset className="flex gap-2 items-center" disabled={generatingResponse}>
                            <div className="relative flex-grow items-center">
                                <textarea
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={generatingResponse ? "" : "Send a message..."}
                                    className="w-full resize-none rounded-xl bg-gray-700 p-2 pl-10 pr-16 text-white focus:border-emerald-500 focus:bg-gray-600 focus:outline focus:outline-emerald-500"
                                />
                                <button type="submit" className="absolute inset-y-0 right-0 top-0 bottom-0 " style={{ fontSize: "1rem", padding: "0.75rem" }}>
                                    <FontAwesomeIcon icon={faPaperPlane} />
                                </button>
                            </div>
                        </fieldset>
                    </form>
                </footer>
            </div>
        </div>
    </>
  );
}

export const getServerSideProps = async (ctx) => {
    const chatId = ctx.params?.chatId?.[0] || null;
    if(chatId) {
        let objectId;

        try {
        objectId = ObjectId.createFromHexString(chatId);
        } catch (e) {
        return {
            redirect: {
                destination: "/chat",
            },
        };
        }
        const { user } = await getSession(ctx.req, ctx.res);
        const client = await clientPromise;
        const db = client.db("Casperai");
        const chat = await db.collection("chats").findOne({
            userId: user.sub,
            _id: objectId,
        });
        if (!chat) {
            return {
              redirect: {
                destination: "/chat",
              },
            };
        }
        return {
            props: {
              chatId,
              title: chat.title,
              messages: chat.messages.map((message) => ({
                ...message,
                _id: uuid(),
              })),
            },
        };
    }
    return {
        props: {}
    }
}