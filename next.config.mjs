/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // exceljs y google-auth-library solo se usan en el servidor
  serverExternalPackages: ["exceljs", "google-auth-library"],
};

export default nextConfig;
