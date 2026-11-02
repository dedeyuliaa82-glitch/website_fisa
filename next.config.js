const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.supabase.co",
            },
        ],
    },
    async redirects() {
        return [
            {
                source: "/rekening",
                destination: "/pengaturan?tab=rekening",
                permanent: false,
            },
        ];
    },
};
export default nextConfig;
