import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
} from "docx";

const mdPath = path.resolve("project-documentation/GridRetail_Project_Report.md");
const mdContent = fs.readFileSync(mdPath, "utf-8");

const lines = mdContent.split("\n");
const children: Paragraph[] = [];

// Title Header
children.push(
  new Paragraph({
    text: "GridRetail — Project Report",
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200, before: 300 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Internal Website Generation Platform",
        italics: true,
        size: 28,
        color: "176B4D",
        bold: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),
  new Paragraph({
    text: "Target Architecture: Next.js 15, React 19, TypeScript 5, Tailwind CSS v4, MongoDB",
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  }),
  new Paragraph({
    text: "Status: Implemented, Stabilized, and Fully Verified (517 Tests Passing)",
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  })
);

let inCodeBlock = false;
let codeBuffer: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith("```")) {
    if (inCodeBlock) {
      // Flush code block
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: codeBuffer.join("\n"),
              font: "Consolas",
              size: 18,
              color: "2D3748",
            }),
          ],
          shading: { fill: "F7FAFC" },
          spacing: { before: 150, after: 150 },
        })
      );
      codeBuffer = [];
      inCodeBlock = false;
    } else {
      inCodeBlock = true;
      codeBuffer = [];
    }
    continue;
  }

  if (inCodeBlock) {
    codeBuffer.push(line);
    continue;
  }

  if (!line.trim()) {
    continue;
  }

  // Heading 1 (# ...)
  if (line.startsWith("# ")) {
    // Skip top title since we already added title
    if (i > 10) {
      children.push(
        new Paragraph({
          text: line.replace("# ", "").trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 150 },
        })
      );
    }
    continue;
  }

  // Heading 2 (## ...)
  if (line.startsWith("## ")) {
    children.push(
      new Paragraph({
        text: line.replace("## ", "").trim(),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
      })
    );
    continue;
  }

  // Heading 3 (### ...)
  if (line.startsWith("### ")) {
    children.push(
      new Paragraph({
        text: line.replace("### ", "").trim(),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
      })
    );
    continue;
  }

  // Check if line refers to an image figure
  if (line.includes("Figure 1:") || line.includes("01-admin-dashboard.png")) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, bold: true, color: "176B4D" })],
        spacing: { before: 150, after: 100 },
      })
    );
    const imgPath = path.resolve("project-documentation/screenshots/01-admin-dashboard.png");
    if (fs.existsSync(imgPath)) {
      try {
        const imgBuffer = fs.readFileSync(imgPath);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 550, height: 320 },
                type: "png",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (e) {
        console.warn("Could not insert image 1", e);
      }
    }
    continue;
  }

  if (line.includes("Figure 2:") || line.includes("02-store-management.png")) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, bold: true, color: "176B4D" })],
        spacing: { before: 150, after: 100 },
      })
    );
    const imgPath = path.resolve("project-documentation/screenshots/02-store-management.png");
    if (fs.existsSync(imgPath)) {
      try {
        const imgBuffer = fs.readFileSync(imgPath);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 550, height: 320 },
                type: "png",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (e) {
        console.warn("Could not insert image 2", e);
      }
    }
    continue;
  }

  if (line.includes("Figure 3:") || line.includes("03-advanced-visual-editor.png")) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, bold: true, color: "176B4D" })],
        spacing: { before: 150, after: 100 },
      })
    );
    const imgPath = path.resolve("project-documentation/screenshots/03-advanced-visual-editor.png");
    if (fs.existsSync(imgPath)) {
      try {
        const imgBuffer = fs.readFileSync(imgPath);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 550, height: 320 },
                type: "png",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (e) {
        console.warn("Could not insert image 3", e);
      }
    }
    continue;
  }

  if (line.includes("Figure 4:") || line.includes("04-generated-website.png")) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, bold: true, color: "176B4D" })],
        spacing: { before: 150, after: 100 },
      })
    );
    const imgPath = path.resolve("project-documentation/screenshots/04-generated-website.png");
    if (fs.existsSync(imgPath)) {
      try {
        const imgBuffer = fs.readFileSync(imgPath);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 550, height: 320 },
                type: "png",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch (e) {
        console.warn("Could not insert image 4", e);
      }
    }
    continue;
  }

  // Bullet point
  if (line.startsWith("- ") || line.startsWith("* ")) {
    children.push(
      new Paragraph({
        text: line.substring(2),
        bullet: { level: 0 },
        spacing: { after: 60 },
      })
    );
    continue;
  }

  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    children.push(
      new Paragraph({
        text: line,
        spacing: { after: 60 },
      })
    );
    continue;
  }

  // Standard paragraph
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: line,
          size: 22,
        }),
      ],
      spacing: { after: 120 },
    })
  );
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1440,
            bottom: 1440,
            left: 1440,
            right: 1440,
          },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = path.resolve("project-documentation/GridRetail_Project_Report.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated DOCX report at: ${outputPath} (${buffer.length} bytes)`);
});
