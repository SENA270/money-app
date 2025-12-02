// app/api/ocr/route.ts
import { NextResponse } from "next/server";

const MODEL_NAME = "models/gemini-2.0-flash";

// 日付を「足りないところだけ今に近い値で補完」する関数
function normalizeDate(isoDateRaw?: string | null): string | null {
  const today = new Date();
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  if (!isoDateRaw || typeof isoDateRaw !== "string") {
    return toIso(today);
  }

  // 完全にきれいならそのまま
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDateRaw)) {
    return isoDateRaw;
  }

  const [yearPart = "", monthPart = "", dayPart = ""] = isoDateRaw.split("-");

  const hasX = (s: string) => s.toUpperCase().includes("X");

  // 年
  let year = today.getFullYear();
  if (yearPart && !hasX(yearPart)) {
    const y = parseInt(yearPart, 10);
    if (!Number.isNaN(y)) {
      year = y < 100 ? 2000 + y : y;
    }
  }

  // 月
  let month = today.getMonth() + 1;
  if (monthPart && !hasX(monthPart)) {
    const m = parseInt(monthPart, 10);
    if (!Number.isNaN(m) && m >= 1 && m <= 12) {
      month = m;
    }
  }

  // 日
  let day = today.getDate();
  if (dayPart && !hasX(dayPart)) {
    const d = parseInt(dayPart, 10);
    if (!Number.isNaN(d) && d >= 1 && d <= 31) {
      day = d;
    }
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Gemini のレスポンスから JSON 文字列を安全に取り出す
function extractJsonText(apiResult: any): string | null {
  const text =
    apiResult?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text ?? "")
      .join("") ?? "";

  if (!text) return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  return text.slice(start, end + 1);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "画像ファイルが見つかりません。" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return NextResponse.json(
        { error: "サーバー設定エラー（APIキー未設定）" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = (file as any).type || "image/jpeg";

    const prompt = `
あなたは日本のレシートを読み取るアシスタントです。
画像からレシートの内容を読み取り、次の項目を JSON で返してください。

- totalAmount: レシートの合計金額（税込）。数値。わからない場合は null。
- isoDate: レシートの日付。「YYYY-MM-DD」形式。ただし読めない数字は X でよい（例: "202X-03-22"）。
- paymentMethod: 支払い方法。次のいずれかの日本語ラベルで返してください。
  ["現金", "クレジットカード", "電子マネー", "交通系IC", "コード決済", "その他"]
- category: このレシート全体の支出カテゴリ。次のいずれかで返してください。
  ["食費", "日用品", "娯楽", "交通", "光熱費", "医療", "その他"]
- recognizedText: レシート全体のテキストをそのまま 1 つの文字列として返してください。

必ず **JSON だけ** を返してください。説明文やコメント、コードブロック（\`\`\`）は一切付けないでください。

出力例:
{"totalAmount": 876, "isoDate": "202X-03-22", "paymentMethod": "クレジットカード", "category": "食費", "recognizedText": "..."}
`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "Gemini API 呼び出しに失敗しました" },
        { status: 500 }
      );
    }

    const apiResult = await geminiRes.json();
    const jsonText = extractJsonText(apiResult);

    if (!jsonText) {
      console.error("Failed to extract JSON from Gemini response:", apiResult);
      return NextResponse.json(
        { error: "Gemini の結果を解析できませんでした" },
        { status: 500 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parse error:", e, jsonText);
      return NextResponse.json(
        { error: "Gemini の JSON 解析に失敗しました" },
        { status: 500 }
      );
    }

    const totalAmount =
      typeof parsed.totalAmount === "number" ? parsed.totalAmount : null;

    const normalizedDate = normalizeDate(parsed.isoDate);

    const paymentMethod =
      typeof parsed.paymentMethod === "string"
        ? parsed.paymentMethod
        : null;

    const category =
      typeof parsed.category === "string" ? parsed.category : null;

    const rawText =
      typeof parsed.recognizedText === "string"
        ? parsed.recognizedText
        : "";

    return NextResponse.json(
      {
        totalAmount,
        date: normalizedDate,
        paymentMethod,
        category,
        rawText,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("OCR route error:", err);
    return NextResponse.json(
      { error: "サーバー側でエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}