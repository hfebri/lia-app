import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

interface SubtitleEntry {
  index: number;
  start: string;
  end: string;
  text: string[];
}

const TIME_SEPARATOR = "-->";

const normalizeLine = (line: string) => line.replace(/\uFEFF/g, "").trim();

function parseTimecode(value: string): string {
  return value.trim();
}

function parseBlock(block: string, fallbackIndex: number): SubtitleEntry | null {
  const lines = block
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  let index = fallbackIndex;
  let timeLineIdx = lines.findIndex((line) => line.includes(TIME_SEPARATOR));

  if (timeLineIdx === -1) {
    return null;
  }

  if (timeLineIdx > 0) {
    const maybeIndex = Number.parseInt(lines[0], 10);
    if (!Number.isNaN(maybeIndex)) {
      index = maybeIndex;
    }
  } else if (timeLineIdx === 0 && lines.length > 1) {
    const maybeIndex = Number.parseInt(lines[1], 10);
    if (!Number.isNaN(maybeIndex)) {
      index = maybeIndex;
    }
  }

  const timeLine = lines[timeLineIdx];
  const [startRaw, endRaw] = timeLine.split(TIME_SEPARATOR);
  if (!startRaw || !endRaw) {
    return null;
  }

  const start = parseTimecode(startRaw);
  const end = parseTimecode(endRaw);
  const textLines = lines.slice(timeLineIdx + 1);

  return {
    index,
    start,
    end,
    text: textLines.length > 0 ? textLines : [""],
  };
}

export function parseSrt(content: string): SubtitleEntry[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized.split(/\n{2,}/);
  const entries: SubtitleEntry[] = [];

  blocks.forEach((block, idx) => {
    const entry = parseBlock(block, idx + 1);
    if (entry) {
      entries.push(entry);
    }
  });

  return entries;
}

function createCaptionParagraph(textLines: string[]): Paragraph {
  const children: TextRun[] = [];

  textLines.forEach((line, index) => {
    children.push(
      new TextRun({
        text: line,
      })
    );

    if (index < textLines.length - 1) {
      children.push(new TextRun({ text: "\n" }));
    }
  });

  return new Paragraph({
    children,
  });
}

function buildSubtitleTable(entries: SubtitleEntry[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Segment", bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Timing", bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Caption", bold: true })],
          }),
        ],
      }),
    ],
  });

  const rows = entries.map(
    (entry) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: entry.index.toString(),
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${entry.start} → ${entry.end}`,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [createCaptionParagraph(entry.text)],
          }),
        ],
      })
  );

  return new Table({
    rows: [headerRow, ...rows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

export async function convertSrtToDocx({
  content,
  sourceFileName,
}: {
  content: string;
  sourceFileName?: string;
}): Promise<{ buffer: Buffer; entryCount: number }> {
  const entries = parseSrt(content);

  if (entries.length === 0) {
    throw new Error("The subtitle file does not contain any captions.");
  }

  const sectionChildren: Array<Paragraph | Table> = [
    new Paragraph({
      text: "Subtitle Transcript",
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  if (sourceFileName) {
    sectionChildren.push(
      new Paragraph({
        text: `Source file: ${sourceFileName}`,
      })
    );
  }

  sectionChildren.push(
    new Paragraph({
      text: `Segments: ${entries.length}`,
    })
  );

  sectionChildren.push(buildSubtitleTable(entries));

  const document = new Document({
    sections: [
      {
        properties: {},
        children: sectionChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);

  return {
    buffer,
    entryCount: entries.length,
  };
}
