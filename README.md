# PixelLite

An open-source, client-side image converter that transforms your images to WebP format with complete privacy.

## Features

- Private & Secure: All image processing happens locally in your browser - no data is ever sent to servers
- Fast Conversion: High-speed WebP conversion using modern web technologies
- Responsive Design: Works seamlessly on desktop, tablet, and mobile devices
- Easy to Use: Simple drag-and-drop interface with instant preview
- Comparison View: Side-by-side comparison of original and converted images
- Open Source: Fully transparent and community-driven

## Getting Started

Prerequisites: Node.js

1. Clone the repository
   ```bash
   git clone https://github.com/rfschubert/pixelite.git
   cd pixelite
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run locally
   ```bash
   npm run dev
   ```

4. Build for production
   ```bash
   npm run build
   ```

## Built With

- React 19 - Modern React with the latest features
- TypeScript - Type-safe development
- Tailwind CSS - Utility-first CSS framework
- Vite - Fast build tool and development server
- Lucide React - Beautiful icons

## Project Structure

```
pixelite/
├── components/          # React components
│   └── ComparisonSlider.tsx
├── utils/              # Utility functions
│   ├── image.ts        # Image processing utilities
│   └── translations.ts # Internationalization
├── public/             # Static assets
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── index.html         # HTML template
└── types.ts           # TypeScript type definitions
```

## Privacy & Security

PixelLite is designed with privacy in mind:

- No server uploads: All image processing happens in your browser
- No data collection: We do not track, store, or transmit any user data
- Open source: Full code transparency - you can audit exactly what the code does
- Offline capable: Once loaded, the app works without internet connection

## Internationalization

PixelLite supports multiple languages. Currently available in:
- English (en)
- Portuguese (pt-BR)
- Spanish (es)

## Contributing

We welcome contributions! Please see our Contributing Guidelines for details.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The open-source community for making web technologies powerful and accessible
- All contributors who help make PixelLite better
- The browser vendors who continue to push the web forward

---

PixelLite - Convert images with confidence and privacy.
