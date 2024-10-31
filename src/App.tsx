import { useState } from 'react';
import { ThemeProvider } from './components/theme/theme-provider';
import { Header } from './components/layout/header';
import { TravelForm } from './components/TravelForm';
import { Toaster } from 'react-hot-toast';

function App() {
  const [layout, setLayout] = useState<"default" | "compact">("default");

  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-background text-foreground">
        <Header layout={layout} setLayout={setLayout} />
        <main className="container mx-auto py-6">
          <TravelForm layout={layout} />
        </main>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;