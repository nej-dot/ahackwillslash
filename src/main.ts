import "./style.css";
import { createApp } from "./app";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("App root #app was not found.");
}

appRoot.append(createApp());
