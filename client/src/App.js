// client/src/App.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faShareAlt } from "@fortawesome/free-solid-svg-icons";
import { Helmet } from "react-helmet";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const socket = io("https://planning-poker-vercel-app-server.vercel.app/");

// const socket = io("http://localhost:4000");

const fibonacciSequence = [1, 2, 3, 5, 8, 13, 21];

function App() {
  const [sessionId, setSessionId] = useState("");
  const [userName, setUserName] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [flipCard, setFlipCard] = useState(false);
  const [flippedCards, setFlippedCards] = useState([]); // New state to track flipped cards

  useEffect(() => {
    console.log("App component rendered");

    const urlParams = new URLSearchParams(window.location.search);
    const sessionCodeFromUrl = urlParams.get("session");

    if (sessionCodeFromUrl) {
      setSessionId(sessionCodeFromUrl);
    }

    socket.on("receiveEstimate", (estimate) => {
      setEstimates((prev) => [...prev, estimate]);
    });

    socket.on("updateUsers", (users) => {
      setUsers(users);
    });

    socket.on("revealCards", () => {
      console.log("revealCards event received");
      setRevealed(true);
      setFlipCard(true);
      setFlippedCards(users.map((user, index) => index)); // Flip all cards
    });

    socket.on("resetVote", () => {
      console.log("resetVote event received");
      setEstimates([]);
      setSelectedCard(null);
      setRevealed(false);
      setFlipCard(false);
      setFlippedCards([]); // Reset flipped cards
    });

    return () => socket.off();
  }, [users]);

  const createSession = () => {
    if (!userName.trim()) {
      toast.error("Please enter your name to create a session.");
      return;
    }

    socket.emit("createSession", (sessionId) => {
      setSessionId(sessionId);
      setIsHost(true);
      joinSession(sessionId);
    });
  };

  const joinSession = (sessionId) => {
    if (!userName.trim()) {
      toast.error("Please enter your name to join a session.");
      return;
    }
    if (!sessionId.trim()) {
      toast.error("Please enter a session ID to join a session.");
      return;
    }

    socket.emit("joinSession", { sessionId, userName }, (response) => {
      if (response.success) {
        console.log("Joined session!");
        setJoined(true);
      } else {
        console.log("Failed to join session:", response.message);
        toast.error(response.message);
      }
    });
  };

  const sendEstimate = (card) => {
    setSelectedCard(card);
    socket.emit("sendEstimate", { sessionId, estimate: card, userName });
  };

  const revealCards = () => {
    const numberOfUsers = users.length;
    const numberOfEstimates = estimates.length;

    if (numberOfEstimates < numberOfUsers) {
      toast.warn("Wait for all participants to submit their estimates.");
      return;
    }

    socket.emit("revealCards", sessionId);
  };

  const resetVote = () => {
    console.log("resetVote called");
    socket.emit("resetVote", sessionId);
  };

  const handleButtonClick = () => {
    console.log("handleButtonClick called, revealed:", revealed);
    if (revealed) {
      resetVote();
    } else {
      revealCards();
    }
  };

  const calculateAverageEstimate = () => {
    if (estimates.length === 0) return 0;
    const sum = estimates.reduce((total, est) => total + est.estimate, 0);
    return sum / estimates.length;
  };

  const findClosestFibonacci = (num) => {
    return fibonacciSequence.reduce((prev, curr) =>
      Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
    );
  };

  const copySessionLink = () => {
    const sessionLink = `${window.location.origin}?session=${sessionId}`;
    navigator.clipboard.writeText(sessionLink).then(
      () => {
        toast.success("Session link copied to clipboard!");
      },
      (err) => {
        console.error("Failed to copy session link: ", err);
        toast.error("Failed to copy session link.");
      }
    );
  };

  const hasUserVoted = (userName) => {
    return estimates.some((est) => est.userName === userName);
  };

  return (
    <div className="App">
      <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@200..700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <ToastContainer
        position="top-center"
        autoClose={1200} // Default duration for all toasts
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {!joined ? (
        <div className="session-container">
          <img
            src={require("./assets/images/PLANNING POKER.png")}
            alt="Logo"
            className="logo"
          />
          <input
            type="text"
            placeholder="YOUR NAME"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") joinSession(sessionId);
            }}
            className="input"
          />
          <div className="session-card-container">
            <div className="session-card">
              <h2>CREATE A NEW SESSION</h2>
              <button onClick={createSession} className="button">
                CREATE SESSION
              </button>
            </div>
            <div className="session-card">
              <h2>JOIN AN EXISTING SESSION</h2>
              <div className="input-container">
                <input
                  type="text"
                  placeholder="SESSION ID"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") joinSession(sessionId);
                  }}
                  className="input"
                />
                <button
                  onClick={() => joinSession(sessionId)}
                  className="button"
                >
                  JOIN SESSION
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="table">
          <div className="logo-container">
            <img
              src={require("./assets/images/PLANNING POKER.png")}
              alt="Logo"
              className="logo"
            />
          </div>
          <div className="session-details">
            <div className="session-info">
              <h2>SESSION ID: {sessionId}</h2>
              <button className="share-button" onClick={copySessionLink}>
                <FontAwesomeIcon icon={faShareAlt} />
              </button>
              <p className="user-name">
                <FontAwesomeIcon icon={faUser} style={{ marginRight: "5px" }} />
                {userName}
              </p>
            </div>
          </div>
          {revealed && (
            <div className="average-closest-container">
              <div className={`average-card ${flipCard ? "flip" : ""}`}>
                <p className="small-text">Average:</p>
                <p className="large-number">
                  {calculateAverageEstimate().toFixed(2)}
                </p>
              </div>
              <div className={`closest-card ${flipCard ? "flip" : ""}`}>
                <p className="small-text">Closest:</p>
                <p className="large-number">
                  {findClosestFibonacci(calculateAverageEstimate())}
                </p>
              </div>
            </div>
          )}
          <div className="cards-container">
            <div className="user-names">
              {users.map((user, index) => (
                <p key={index} className="capitalize">
                  {user.name}
                </p>
              ))}
            </div>
            <div className="estimates">
              {users.map((user, index) => (
                <div key={index} className="estimate-card">
                  {revealed ? (
                    <p>
                      {
                        estimates.find((est) => est.userName === user.name)
                          ?.estimate
                      }
                    </p>
                  ) : (
                    <p>{hasUserVoted(user.name) ? "✔" : "?"}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="card-deck">
              {fibonacciSequence.map((card) => (
                <div
                  key={card}
                  className={`card ${selectedCard === card ? "selected" : ""}`}
                  onClick={() => sendEstimate(card)}
                >
                  {card}
                </div>
              ))}
            </div>
          </div>
          {isHost && (
            <div className="button-container">
              <button
                onClick={handleButtonClick}
                className={`button ${revealed ? "reset" : "reveal"}`}
              >
                {revealed ? "RESET" : "REVEAL"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
