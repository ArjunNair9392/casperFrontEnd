import { useUser } from '@auth0/nextjs-auth0/client';
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import Image from "next/image";
import ReactMarkdown from 'react-markdown';

export const Message = ({role, content, isNew}) => {
    const { user } = useUser();
    const [displayedContent, setDisplayedContent] = useState("");

    useEffect(() => {
        if (isNew && role === "assistant") {
            const displayText = () => {
                for (let i = 0; i <= content.length; i++) {
                    setTimeout(() => {
                        setDisplayedContent(content.substring(0, i));
                    }, i * 10);
                }
            };

            displayText();

            return () => {
                clearTimeout();
            };
        } else {
            setDisplayedContent(content);
        }
    }, [content, role, isNew]);
    return(
        <div
            className={`grid grid-cols-[30px_1fr] gap-5 p-5 ${
                role === "assistant"
                ? "bg-gray-600"
                : role === "notice"
                ? "bg-red-600"
                : ""
            }`}
        >
            <div>
                {role === "user" && !!user && (
                    <Image 
                        src={user.picture}
                        width={30} 
                        height={30}
                        alt="user avatar" 
                        className="rounded-sm shadow-md shadow-black/50" />
                )}
                {role === "assistant" && (
                    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-sm bg-gray-800 shadow-md shadow-black/50">
                        <FontAwesomeIcon icon={faRobot} className="text-emerald-200" />
                    </div>
                )}
            </div>
            <div className="prose prose-invert">
                <ReactMarkdown>{displayedContent}</ReactMarkdown>
            </div>
        </div>
    )
}