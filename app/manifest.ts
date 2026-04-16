import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PullFund",
    short_name: "PullFund",
    description: "Founder-focused directory for grants, accelerators, incubators, and VC funds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4ef",
    theme_color: "#17191c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
