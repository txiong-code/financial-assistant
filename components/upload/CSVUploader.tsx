"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";

interface Props {
  onParsed: (csvText: string) => void;
}

export function CSVUploader({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onParsed(text);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />
      <p className="text-lg font-medium text-gray-700">Drop your bank CSV here</p>
      <p className="mt-1 text-sm text-gray-500">
        or click to browse — must include <code>date</code>, <code>description</code>, <code>amount</code> columns
      </p>
      <p className="mt-3 text-xs text-gray-400">
        No CSV?{" "}
        <a
          href="/sample.csv"
          download
          className="underline hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          Download sample data
        </a>
      </p>
    </div>
  );
}
