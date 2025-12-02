// list-models.js
import fetch from "node-fetch"; // npm i node-fetch が必要（既にあればOK）

const API_KEY = process.env.GEMINI_API_KEY; // いつも使ってるキー

if (!API_KEY) {
  console.error("GEMINI_API_KEY が設定されていません");
  process.exit(1);
}

async function main() {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/models",
    {
      headers: {
        "x-goog-api-key": API_KEY,
      },
    }
  );

  if (!res.ok) {
    console.error("ListModels error:", await res.text());
    process.exit(1);
  }

  const data = await res.json();
  // 見やすいようにモデル名だけ出す
  for (const m of data.models ?? []) {
    console.log(m.name, " | ", m.displayName ?? "");
  }
}

main().catch(console.error);