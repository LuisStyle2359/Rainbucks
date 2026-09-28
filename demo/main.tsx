import { createRoot } from "react-dom/client";
import { DemoApp } from "./demo-app";
import "./demo.css";

const container = document.getElementById("root");
if (container) createRoot(container).render(<DemoApp />);
