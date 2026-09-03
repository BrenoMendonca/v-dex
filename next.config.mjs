/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.3.161"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/**",
      },
      {
        protocol: "https",
        hostname: "play.pokemonshowdown.com",
        pathname: "/sprites/**",
      },
    ],
  },
};

export default nextConfig;
