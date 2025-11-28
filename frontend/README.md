# Farcaster Gas Checker - Frontend

A beautiful Next.js frontend for checking gas usage of Farcaster users.

## ✨ Features

- 🔍 Search by Farcaster username (fname or ENS)
- 👛 View all connected wallets
- ⛽ Gas estimates for Ethereum & Base
- 🎨 Beautiful dark UI with animations
- 📱 Fully responsive design

## 🚀 Quick Start

### Prerequisites

1. **Python Backend** must be running on `http://localhost:8000`
   ```bash
   cd ../farcaster-gas-backend
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

### Run Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/gas/route.ts    # API route → Python backend
│   │   ├── globals.css          # Styles & animations
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main page
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx       # Button component
│   │   │   ├── card.tsx         # Card component
│   │   │   └── input.tsx        # Input component
│   │   └── gas-checker.tsx      # Main gas checker UI
│   └── lib/
│       └── utils.ts             # Utility functions
├── .env.local                   # Environment variables
├── tailwind.config.js           # Tailwind config
└── package.json
```

## 🔗 API Integration

The frontend connects to Python backend at `BACKEND_URL`:

```
GET /api/gas?username=dwr.eth

Response:
{
  "success": true,
  "username": "dwr.eth",
  "fid": 3,
  "display_name": "Dan Romero",
  "pfp_url": "https://...",
  "wallets": [...],
  "primary_wallet": "0x...",
  "total_gas_used_eth": 0.1234,
  "total_gas_used_base": 0.0001,
  "total_gas_usd": 432.10
}
```

## ⚠️ Note on Gas Data

Gas estimates are currently **mock data** based on transaction counts because:
- Etherscan/Basescan API keys not configured
- Real gas calculation requires scanning all transactions

To enable real gas data:
1. Get API keys from [Etherscan](https://etherscan.io/apis) and [Basescan](https://basescan.org/apis)
2. Add to backend `.env`:
   ```
   ETHERSCAN_API_KEY=your_key
   BASESCAN_API_KEY=your_key
   ```

## 🎨 Customization

### Colors
Edit `tailwind.config.js` and `globals.css` to change theme colors.

### Components
All UI components are in `src/components/ui/` - easy to modify or replace with shadcn/ui.

## 🚀 Deploy

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variable:
- `BACKEND_URL` = your deployed backend URL

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📝 License

MIT
