import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Elite Fashions, Erode",
    short_name: "Elite Fashions",
    description: "Festive & party wear for girls. Order on WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf3",
    theme_color: "#3b0a36",
    icons: [{ src: "/brand/logo.png", sizes: "400x400", type: "image/png" }],
  };
}
