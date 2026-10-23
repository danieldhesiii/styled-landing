"use client";
import { useState } from "react";
import type { WeddingBoard } from "@/lib/wedding";

export type BoardTarget = {
  kind: "product" | "look";
  ref: string;
  text?: string;
};
export interface BoardPickerProps {
  boards?: WeddingBoard[];
  boardsBusy?: boolean;
  /** Parent persists the pin and returns true only after a successful save. */
  onAddToBoard?: (boardId: string, target: BoardTarget) => Promise<boolean>;
}
export default function BoardPicker({
  boards = [],
  boardsBusy = false,
  onAddToBoard,
  target,
}: BoardPickerProps & { target: BoardTarget }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  if (!onAddToBoard) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setMessage("");
        }}
        className="min-h-11 w-full rounded-full border border-sand px-4 py-2 text-sm"
      >
        Add to board
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-sand p-3">
          <p className="mb-2 text-xs text-ink/60">
            Choose a board. This does not reserve stock.
          </p>
          {!boards.length && (
            <p className="text-xs">
              {boardsBusy
                ? "Loading boards…"
                : "Create a board in Boards first."}
            </p>
          )}
          <div className="flex max-h-48 flex-col gap-2 overflow-auto">
            {boards.map((board) => {
              const pinned = board.pins.some(
                (pin) => pin.kind === target.kind && pin.ref === target.ref,
              );
              return (
                <button
                  key={board.id}
                  type="button"
                  disabled={
                    boardsBusy || pending || pinned || board.pins.length >= 100
                  }
                  className="min-h-11 rounded-lg border border-sand px-3 text-left text-sm disabled:opacity-50"
                  onClick={async () => {
                    setPending(true);
                    setMessage("");
                    try {
                      setMessage(
                        (await onAddToBoard(board.id, target))
                          ? `Added to ${board.name}`
                          : "Could not save to board. Try again.",
                      );
                    } catch {
                      setMessage("Could not save to board. Try again.");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  {board.name}
                  {pinned
                    ? " · Already added"
                    : board.pins.length >= 100
                      ? " · Board full"
                      : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs text-clay">
          {message}
        </p>
      )}
    </div>
  );
}
