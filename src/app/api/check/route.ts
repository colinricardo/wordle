import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import wordList from "word-list-json";

let words: Set<string>;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const word = searchParams.get("word");

  if (!word) {
    return NextResponse.json(
      { error: "Word parameter is required" },
      { status: 400 }
    );
  }

  if (!words) {
    words = new Set(wordList);
  }

  const isValid = words.has(word.toLowerCase());
  return NextResponse.json({ word, isValid });
}
