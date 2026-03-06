import { Toaster } from "@/components/ui/sonner";
import HarVisionApp from "./components/HarVisionApp";

export default function App() {
  return (
    <>
      <HarVisionApp />
      <Toaster position="bottom-right" theme="dark" />
    </>
  );
}
