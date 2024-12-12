import { useState } from 'react'
import './App.css'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';

const API_KEY = import.meta.env.VITE_API_KEY;
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

const systemMessage = { 
  "role": "system",
  "content": "Explain things like you're talking to someone about music"
}

function App() {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm Music Finder! Ask me anything related to finding different artists or songs!",
      direction: "incoming",
      sentTime: "just now",
      sender: "ChatGPT"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (message) => {
    const newMessage = {
      message,
      direction: 'outgoing',
      sender: "user"
    };

    const newMessages = [...messages, newMessage];
    
    setMessages(newMessages);

    // Initial system message to determine ChatGPT functionality
    setIsTyping(true);
    await processMessageToChatGPT(newMessages);
  };

  const getSpotifyToken = async () => {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        )}`,
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();
    return data.access_token;
  };

    // Function to search Spotify for tracks or artists
    const searchSpotify = async (query) => {
      try {
        const token = await getSpotifyToken();
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${query}&type=track,artist`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        if (!response.ok) throw new Error("Failed to fetch Spotify data");
  
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Spotify API Error:", error);
        return null;
      }
    };

  // Process messages (GPT + Spotify integration)
  const processMessageToChatGPT = async (chatMessages) => {
    const lastMessage = chatMessages[chatMessages.length - 1].message;

    // Check if the message is music-related (Spotify query)
    if (lastMessage.toLowerCase().includes("spotify") || lastMessage.toLowerCase().includes("song")) {
      const spotifyResults = await searchSpotify(lastMessage);

      if (spotifyResults && spotifyResults.tracks) {
        const formattedResults = spotifyResults.tracks.items
          .map(
            (track) =>
              `🎵 ${track.name} by ${track.artists
                .map((artist) => artist.name)
                .join(", ")}`
          )
          .join("\n");

        setMessages([
          ...chatMessages,
          {
            message: `Here are some results from Spotify:\n${formattedResults}`,
            sender: "Music Finder",
            direction: "incoming",
          },
        ]);
        setIsTyping(false);
        return;
      }

      // If Spotify API fails
      setMessages([
        ...chatMessages,
        {
          message: "Sorry, I couldn't find any songs for that query.",
          sender: "Music Finder",
          direction: "incoming",
        },
      ]);
      setIsTyping(false);
      return;
    }

    // If not music-related, forward to GPT API
    const apiMessages = chatMessages.map((messageObject) => {
      const role = messageObject.sender === "Music Finder" ? "assistant" : "user";
      return { role: role, content: messageObject.message };
    });

    const apiRequestBody = {
      model: "gpt-3.5-turbo",
      messages: [systemMessage, ...apiMessages],
    };

    await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiRequestBody),
    })
      .then((data) => data.json())
      .then((data) => {
        setMessages([
          ...chatMessages,
          {
            message: data.choices[0].message.content,
            sender: "Music Finder",
            direction: "incoming",
          },
        ]);
        setIsTyping(false);
      });
  };

  return (
    <div className="App">
      <div style={{ position:"relative", height: "800px", width: "700px"  }}>
        <MainContainer>
          <ChatContainer>       
            <MessageList 
              scrollBehavior="smooth" 
              typingIndicator={isTyping ? <TypingIndicator content="Music Finder is typing" /> : null}
            >
              {messages.map((message, i) => {
                console.log(message)
                return <Message key={i} model={message} />
              })}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} />        
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  )
}

export default App