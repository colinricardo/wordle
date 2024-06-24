"use client";

import copy from "copy-to-clipboard";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { allWords } from "./words";

const isValidWord = async (word: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/check?word=${encodeURIComponent(word)}`);
    const data = await response.json();
    return data.isValid;
  } catch (error) {
    console.error("Error checking word validity:", error);
    return false;
  }
};

interface WordLengthBadgeProps {
  length: number;
  isActive: boolean;
  onClick: () => void;
}

const WordLengthBadge: React.FC<WordLengthBadgeProps> = ({
  length,
  isActive,
  onClick,
}) => (
  <button
    tabIndex={-1}
    className={`badge ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    {length}
  </button>
);

interface CellProps {
  value: string;
  status: string;
  animate: boolean;
  scale: boolean;
}

const Cell: React.FC<CellProps> = ({ value, status, animate, scale }) => {
  return (
    <div
      className={`cell ${status} ${animate ? "flip" : ""} ${
        scale ? "scale" : ""
      }`}
    >
      <div className="cell-inner">
        <div className="cell-front">{value}</div>
        <div className="cell-back">{value}</div>
      </div>
    </div>
  );
};

interface RowProps {
  guess: string;
  targetWord: string;
  isSubmitted: boolean;
  isCurrentRow: boolean;
  wordLength: number;
}

const Row: React.FC<RowProps> = ({
  guess,
  targetWord,
  isSubmitted,
  isCurrentRow,
  wordLength,
}) => {
  const [animationDelay, setAnimationDelay] = useState<boolean[]>([]);
  const [scaleAnimation, setScaleAnimation] = useState<boolean[]>([]);
  const [prevGuessLength, setPrevGuessLength] = useState(0);

  useEffect(() => {
    setAnimationDelay(Array(wordLength).fill(false));
    setScaleAnimation(Array(wordLength).fill(false));
  }, [wordLength]);

  useEffect(() => {
    if (isSubmitted) {
      for (let i = 0; i < wordLength; i++) {
        setTimeout(() => {
          setAnimationDelay((prev) => {
            const newDelay = [...prev];
            newDelay[i] = true;
            return newDelay;
          });
        }, i * 300);
      }
    }
  }, [isSubmitted, wordLength]);

  useEffect(() => {
    if (isCurrentRow) {
      const lastIndex = guess.length - 1;
      if (lastIndex >= 0 && guess.length > prevGuessLength) {
        setScaleAnimation((prev) => {
          const newScale = [...prev];
          newScale[lastIndex] = true;
          return newScale;
        });
        setTimeout(() => {
          setScaleAnimation((prev) => {
            const newScale = [...prev];
            newScale[lastIndex] = false;
            return newScale;
          });
        }, 100);
      }
      setPrevGuessLength(guess.length);
    }
  }, [guess, isCurrentRow, prevGuessLength]);

  const getStatus = (guessLetter: string, index: number): string => {
    if (!isSubmitted || !guessLetter) return "";

    if (guessLetter === targetWord[index]) {
      return "correct";
    }

    // Count remaining occurrences of the letter in the target word
    const remainingTargetCount = targetWord
      .split("")
      .reduce((count, letter, i) => {
        if (letter === guessLetter && guess[i] !== letter) {
          return count + 1;
        }
        return count;
      }, 0);

    // Count yellow positions of the letter before this index
    const yellowBefore = guess
      .slice(0, index)
      .split("")
      .filter(
        (letter, i) =>
          letter === guessLetter &&
          targetWord.includes(letter) &&
          letter !== targetWord[i]
      ).length;

    if (
      targetWord.includes(guessLetter) &&
      yellowBefore < remainingTargetCount
    ) {
      return "present";
    }

    return "absent";
  };

  return (
    <div
      className="row"
      style={{ "--word-length": wordLength } as React.CSSProperties}
    >
      {Array(wordLength)
        .fill(0)
        .map((_, i) => (
          <Cell
            key={i}
            value={guess[i] || ""}
            status={getStatus(guess[i], i)}
            animate={animationDelay[i]}
            scale={scaleAnimation[i]}
          />
        ))}
    </div>
  );
};

interface GridProps {
  guesses: string[];
  currentGuess: string;
  targetWord: string;
  wordLength: number;
}

const Grid: React.FC<GridProps> = ({
  guesses,
  currentGuess,
  targetWord,
  wordLength,
}) => {
  const totalRows = 6;
  const filledRows = guesses.length;
  const currentRow = filledRows < totalRows ? 1 : 0;
  const emptyRows = Math.max(0, totalRows - filledRows - currentRow);

  return (
    <div className="grid">
      {guesses.map((guess, i) => (
        <Row
          key={i}
          guess={guess}
          targetWord={targetWord}
          isSubmitted={true}
          isCurrentRow={false}
          wordLength={wordLength}
        />
      ))}
      {filledRows < totalRows && (
        <Row
          key="current"
          guess={currentGuess}
          targetWord={targetWord}
          isSubmitted={false}
          isCurrentRow={true}
          wordLength={wordLength}
        />
      )}
      {Array.from({ length: emptyRows }).map((_, i) => (
        <Row
          key={`empty-${i}`}
          guess=""
          targetWord={targetWord}
          isSubmitted={false}
          isCurrentRow={false}
          wordLength={wordLength}
        />
      ))}
    </div>
  );
};

interface KeyboardProps {
  guesses: string[];
  targetWord: string;
  onKeyPress: (key: string) => void;
}

const Keyboard: React.FC<KeyboardProps> = ({
  guesses,
  targetWord,
  onKeyPress,
}) => {
  const letterStatus: { [key: string]: string } = {};

  if (targetWord) {
    guesses.forEach((guess) => {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] && targetWord[i]) {
          const letter = guess[i].toUpperCase();
          if (letter === targetWord[i].toUpperCase()) {
            letterStatus[letter] = "correct";
          } else if (
            targetWord.toUpperCase().includes(letter) &&
            letterStatus[letter] !== "correct"
          ) {
            letterStatus[letter] = "present";
          } else if (!letterStatus[letter]) {
            letterStatus[letter] = "absent";
          }
        }
      }
    });
  }

  const keyboardLayout = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];

  return (
    <div className="keyboard">
      {keyboardLayout.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => (
            <button
              key={key}
              className={`keyboard-key ${letterStatus[key] || ""} ${
                key === "ENTER" || key === "BACKSPACE" ? "wide" : ""
              }`}
              onClick={() => onKeyPress(key)}
              tabIndex={-1}
            >
              {key === "BACKSPACE" ? (
                <span style={{ fontSize: "1.2em" }}>⌫</span>
              ) : (
                key
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

interface GameState {
  wordLength: number;
  targetWord: string;
  targetWordKey: number;
  guesses: string[];
  currentGuess: string;
  message: string;
  gameOver: boolean;
}

const Wordle: React.FC = () => {
  const isInitialized = useRef(false);

  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("wordleState");
      if (savedState) {
        return JSON.parse(savedState) as GameState;
      }
    }
    return {
      wordLength: 5,
      targetWord: "",
      targetWordKey: -1,
      guesses: [],
      currentGuess: "",
      message: "",
      gameOver: false,
    };
  });

  const {
    wordLength,
    targetWord,
    targetWordKey,
    guesses,
    currentGuess,
    message,
    gameOver,
  } = gameState;

  const getWordsByLength = useCallback((length: number) => {
    return Array.from(allWords.entries()).filter(
      ([_, word]) => word.length === length
    );
  }, []);

  const chooseRandomWord = useCallback(
    (length: number) => {
      const wordsByLength = getWordsByLength(length);
      if (wordsByLength.length === 0) {
        console.error(`No words found with length ${length}`);
        return null;
      }
      const randomIndex = Math.floor(Math.random() * wordsByLength.length);
      const [key, word] = wordsByLength[randomIndex];
      return { key, word };
    },
    [getWordsByLength]
  );

  const getWordByKey = useCallback((key: number) => {
    return allWords.get(key);
  }, []);

  const getFallbackWord = useCallback((length: number) => {
    const fallbackWords = {
      5: "world",
      6: "puzzle",
      7: "wordles",
    };
    return fallbackWords[length as keyof typeof fallbackWords] || "fallback";
  }, []);

  const saveGameState = useCallback((newState: Partial<GameState>) => {
    setGameState((prevState) => {
      const updatedState = { ...prevState, ...newState };
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("wordleState", JSON.stringify(updatedState));
        }
      } catch (error) {
        console.error("Error saving game state:", error);
      }
      return updatedState;
    });
  }, []);

  const initializeGame = useCallback(
    (newLength?: number, seed?: number) => {
      if (isInitialized.current && !seed && newLength === wordLength) {
        return;
      }

      let newWordLength = newLength || wordLength;
      let newTargetWord: string;
      let newTargetWordKey: number;

      if (seed !== undefined) {
        const word = getWordByKey(seed);
        if (word) {
          newTargetWord = word;
          newTargetWordKey = seed;
          newWordLength = word.length;
        } else {
          console.error(`No word found for seed ${seed}`);
          newTargetWord = getFallbackWord(newWordLength);
          newTargetWordKey = -1;
        }
      } else {
        const result = chooseRandomWord(newWordLength);
        if (result) {
          newTargetWord = result.word;
          newTargetWordKey = result.key;
        } else {
          console.error(
            `Failed to choose random word for length ${newWordLength}`
          );
          newTargetWord = getFallbackWord(newWordLength);
          newTargetWordKey = -1;
        }
      }

      saveGameState({
        wordLength: newWordLength,
        targetWord: newTargetWord,
        targetWordKey: newTargetWordKey,
        guesses: [],
        currentGuess: "",
        message: "",
        gameOver: false,
      });

      isInitialized.current = true;
    },
    [chooseRandomWord, getWordByKey, getFallbackWord, saveGameState, wordLength]
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get("s");
    if (seedParam) {
      const seed = parseInt(seedParam, 10);
      initializeGame(undefined, seed);

      urlParams.delete("s");
      const newUrl = `${window.location.pathname}${
        urlParams.toString() ? `?${urlParams.toString()}` : ""
      }`;
      window.history.replaceState({}, "", newUrl);
    } else if (!targetWord) {
      initializeGame(wordLength);
    }
  }, [initializeGame, targetWord, wordLength]);

  const handleWordLengthChange = (newLength: number) => {
    if (newLength !== wordLength) {
      if (guesses.length > 0 || currentGuess.length > 0) {
        const confirmChange = window.confirm(
          "Changing the word length will reset the game. Are you sure you want to continue?"
        );
        if (confirmChange) {
          initializeGame(newLength);
        }
      } else {
        initializeGame(newLength);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (currentGuess.length !== wordLength) {
      saveGameState({ message: `Please enter a ${wordLength}-letter word.` });
      return;
    }

    const isValid = await isValidWord(currentGuess);
    if (!isValid) {
      saveGameState({ message: "Not a valid word." });
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    let newMessage = "";
    let newGameOver = false;

    if (currentGuess === targetWord) {
      newMessage = "Congratulations! You guessed the word.";
      newGameOver = true;
    } else if (newGuesses.length === 6) {
      newMessage = `Game over. The word was: ${targetWord}`;
      newGameOver = true;
    }

    saveGameState({
      guesses: newGuesses,
      currentGuess: "",
      message: newMessage,
      gameOver: newGameOver,
    });
  }, [currentGuess, guesses, targetWord, wordLength, saveGameState]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameOver) return;

      if (key === "ENTER") {
        handleSubmit().catch(console.error);
      } else if (key === "BACKSPACE") {
        saveGameState({ currentGuess: currentGuess.slice(0, -1) });
      } else if (currentGuess.length < wordLength) {
        saveGameState({ currentGuess: currentGuess + key.toLowerCase() });
      }
    },
    [gameOver, currentGuess, handleSubmit, wordLength, saveGameState]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        return;
      }

      if (e.key === "Enter") {
        handleSubmit().catch(console.error);
      } else if (e.key === "Backspace") {
        saveGameState({ currentGuess: currentGuess.slice(0, -1) });
      } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < wordLength) {
        saveGameState({ currentGuess: currentGuess + e.key.toLowerCase() });
      }
    },
    [gameOver, currentGuess, handleSubmit, wordLength, saveGameState]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const generateShareText = useCallback(() => {
    const emojiBoard = guesses
      .map((guess) =>
        guess
          .split("")
          .map((letter, index) => {
            if (letter === targetWord[index]) {
              return "🟩";
            } else if (targetWord.includes(letter)) {
              return "🟨";
            } else {
              return "⬛";
            }
          })
          .join("")
      )
      .join("\n");

    const shareUrl = `${window.location.origin}${window.location.pathname}?s=${targetWordKey}`;

    return `Check out my Infinite Wordle score!\n\n${emojiBoard}\n\nWord length: ${wordLength}\n\nPlay this puzzle: ${shareUrl}`;
  }, [guesses, targetWord, targetWordKey, wordLength]);

  const handleShare = useCallback(() => {
    const shareText = generateShareText();
    const success = copy(shareText);
    if (success) {
      saveGameState({ message: "Results copied to clipboard!" });
    } else {
      console.error("Failed to copy");
      saveGameState({ message: "Failed to copy results." });
    }
  }, [generateShareText, saveGameState]);

  const handlePlayAgain = useCallback(() => {
    const result = chooseRandomWord(wordLength);
    if (result) {
      saveGameState({
        targetWord: result.word,
        targetWordKey: result.key,
        guesses: [],
        currentGuess: "",
        message: "",
        gameOver: false,
      });
    } else {
      console.error(`Failed to choose random word for length ${wordLength}`);
      const fallbackWord = getFallbackWord(wordLength);
      saveGameState({
        targetWord: fallbackWord,
        targetWordKey: -1,
        guesses: [],
        currentGuess: "",
        message: "",
        gameOver: false,
      });
    }
  }, [chooseRandomWord, getFallbackWord, saveGameState, wordLength]);

  if (!targetWord) {
    return null;
  }

  return (
    <div className="container">
      <h1 className="text-2xl font-bold text-center">Infinite Wordle</h1>
      <div className="word-length-badges">
        {[5, 6, 7].map((length) => (
          <WordLengthBadge
            key={length}
            length={length}
            isActive={wordLength === length}
            onClick={() => handleWordLengthChange(length)}
          />
        ))}
      </div>
      {targetWord ? (
        <Grid
          guesses={guesses}
          currentGuess={currentGuess}
          targetWord={targetWord}
          wordLength={wordLength}
        />
      ) : null}
      <div className="message-area">{message}</div>
      <div className="button-area">
        {gameOver && (
          <>
            <button onClick={handlePlayAgain} className="play-again">
              Play Again
            </button>
            <button onClick={handleShare} className="share">
              Share
            </button>
          </>
        )}
      </div>
      {targetWord && (
        <Keyboard
          guesses={guesses}
          targetWord={targetWord}
          onKeyPress={handleKeyPress}
        />
      )}
    </div>
  );
};

export default Wordle;
