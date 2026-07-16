import React from "react";
import HomePage from "@/components/HomePage";
import Navbar from "@/components/Navbar"; 
export default function Home() {
  return (
    <div>
      <title>MMGC - Medical Management and General Care</title>
      <header className="sticky top-0 z-50">
          <Navbar />
        </header>
      <main>
        <HomePage />
      </main>
    </div>
  );
}
