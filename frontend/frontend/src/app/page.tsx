import GasChecker from '@/components/gas-checker';

export default function Home() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="text-center mb-12 animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-purple-300">Connected to Farcaster</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="gradient-text">Gas Checker</span>
        </h1>
        
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Discover how much gas any Farcaster user has spent on 
          <span className="text-blue-400"> Ethereum</span> and 
          <span className="text-blue-500"> Base</span>
        </p>
      </header>

      {/* Main Component */}
      <GasChecker />

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a 
            href="https://farcaster.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors"
          >
            Farcaster
          </a>
          <span>•</span>
          <a 
            href="https://neynar.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors"
          >
            Powered by Neynar
          </a>
          <span>•</span>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors"
          >
            GitHub
          </a>
        </div>
        <p>Built with 💜 for the Farcaster community</p>
      </footer>
    </div>
  );
}
