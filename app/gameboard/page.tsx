import { Suspense } from "react";
import Gameboard from "./Gameboard";

export default function GameboardPage() {
  return (
    <Suspense fallback={null}>
      <Gameboard />
    </Suspense>
  );
}
