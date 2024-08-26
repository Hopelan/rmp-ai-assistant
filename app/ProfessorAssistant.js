import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendIcon, UserIcon, GraduationCapIcon } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ReloadIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export default function ProfessorAssistant({
  messages,
  message,
  setMessage,
  sendMessage,
}) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div>
        You are not signed in, sign in <Link href="/sign">here</Link>{" "}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GraduationCapIcon className="w-8 h-8" />
            <span className="text-xl font-bold">ProfRate</span>
          </div>
          <ul className="flex space-x-4">
            <li>
              <SignedIn variant="ghost" className="text-primary-foreground">
                <UserButton />
              </SignedIn>
            </li>
            <li>
              <SignedOut variant="ghost" className="text-primary-foreground">
                <SignInButton />
              </SignedOut>
            </li>
          </ul>
        </div>
      </nav>

      <main className="flex-grow container mx-auto p-4">
        <header className="text-center mb-8">
          <GraduationCapIcon className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">
            Professor Ratings Assistant
          </h1>
          <p className="text-muted-foreground">
            Get insights on professors and their ratings. Ask me anything!
          </p>
        </header>

        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">
              Chat with the Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "assistant"
                      ? "justify-start"
                      : "justify-end"
                  } mb-4`}
                >
                  <div
                    className={`flex items-end ${
                      message.role === "assistant"
                        ? "flex-row"
                        : "flex-row-reverse"
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      {message.role === "assistant" ? (
                        <AvatarImage
                          src="/placeholder.svg?height=32&width=32"
                          alt="AI Assistant"
                        />
                      ) : (
                        <AvatarFallback>
                          <UserIcon className="w-4 h-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div
                      className={`mx-2 p-3 rounded-lg ${
                        message.role === "assistant"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form className="flex w-full items-center space-x-2">
              <Input
                id="message"
                placeholder="Ask about professor ratings..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={sendMessage} size="icon">
                <SendIcon className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
