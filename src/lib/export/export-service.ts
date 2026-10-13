import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Store, Template, Product } from "@/types";
import { ZipBuilder } from "./zip-builder";

export interface GeneratedExportBundle {
  buffer: Buffer;
  fileSizeBytes: number;
  checksumSha256: string;
  artifactName: string;
  artifactUrl: string;
  files: string[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class ExportService {
  private static exportDir = path.join(process.cwd(), "public", "uploads", "exports");

  private static async ensureDir(dirPath: string) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch {
      // directory already exists
    }
  }

  /**
   * Generates a complete standalone production export bundle (.zip)
   */
  public static async generateStoreBundle(
    store: Store,
    template: Template | null,
    products: Product[]
  ): Promise<GeneratedExportBundle> {
    const branding = store.branding || {
      primaryColor: template?.colorPalette.primary || "#176B4D",
      secondaryColor: template?.colorPalette.secondary || "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: `Welcome to ${store.name}`,
      heroSubheadline: `Curated ${store.industry} collection designed for modern living.`,
      aboutText: store.description,
      ctaText: "Explore Catalog",
    };

    const orderedSections = store.orderedSections || [
      "hero",
      "featured_products",
      "about",
      "newsletter",
      "footer",
    ];

    const enabledSections = store.enabledSections || [
      "hero",
      "featured_products",
      "about",
      "newsletter",
      "footer",
    ];

    // 1. Generate store-manifest.json
    const manifest = {
      gridRetailVersion: "1.0.0",
      exportTimestamp: new Date().toISOString(),
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        clientName: store.clientName,
        industry: store.industry,
        description: store.description,
        status: store.status,
      },
      template: template
        ? {
            id: template.id,
            name: template.name,
            style: template.style,
            colorPalette: template.colorPalette,
          }
        : null,
      branding,
      layout: {
        orderedSections,
        enabledSections,
      },
      catalog: {
        totalItems: products.length,
        categories: Array.from(new Set(products.map((p) => p.category))),
      },
    };

    // 2. Generate products.json
    const productsJson = JSON.stringify(products, null, 2);

    // 3. Generate styles.css
    const isDark =
      template?.style === "High-Tech Dark" ||
      template?.style === "Luxury Haute" ||
      template?.style === "Bold Grid";

    const cssContent = `
:root {
  --primary-color: ${branding.primaryColor || "#176B4D"};
  --secondary-color: ${branding.secondaryColor || (isDark ? "#0F172A" : "#FAF9F6")};
  --font-family: ${branding.fontFamily || "Inter, -apple-system, BlinkMacSystemFont, sans-serif"};
  --text-color: ${isDark ? "#F8FAFC" : "#18231E"};
  --surface-color: ${isDark ? "#1E293B" : "#FFFFFF"};
  --border-color: ${isDark ? "#334155" : "#E4E9E5"};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  background-color: var(--secondary-color);
  color: var(--text-color);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

.banner-strip {
  background-color: ${isDark ? "#1E293B" : "#F0F4F1"};
  border-bottom: 1px solid var(--border-color);
  padding: 8px 16px;
  font-size: 12px;
  text-align: center;
}

header {
  position: sticky;
  top: 0;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero-section {
  text-align: center;
  padding: 80px 24px;
}

.hero-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  margin-bottom: 16px;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
  line-height: 1.15;
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.75;
  max-width: 640px;
  margin: 0 auto 24px auto;
}

.btn-primary {
  display: inline-block;
  background: var(--primary-color);
  color: #FFFFFF;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 40px 0;
}

.product-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.product-thumb {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.product-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-name {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 8px;
}

.product-desc {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 16px;
}

.product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.product-price {
  font-size: 16px;
  font-weight: 700;
}

.about-section {
  padding: 60px 24px;
  text-align: center;
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
}

.newsletter-section {
  padding: 60px 24px;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

footer {
  border-top: 1px solid var(--border-color);
  padding: 32px 24px;
  font-size: 12px;
  opacity: 0.75;
  text-align: center;
}
`;

    // 4. Generate dynamic index.html adhering to orderedSections and enabledSections
    const renderedSectionsHtml: string[] = [];

    for (const sectionId of orderedSections) {
      if (!enabledSections.includes(sectionId)) continue;

      if (sectionId === "hero") {
        renderedSectionsHtml.push(`
    <!-- HERO SECTION -->
    <section class="hero-section">
      <div class="hero-tag">${escapeHtml(store.industry)} &bull; ${escapeHtml(template?.style || "Contemporary")}</div>
      <h1 class="hero-title">${escapeHtml(branding.heroHeadline || `Welcome to ${store.name}`)}</h1>
      <p class="hero-subtitle">${escapeHtml(branding.heroSubheadline || `Curated ${store.industry} collection.`)}</p>
      <div>
        <a href="#catalog" class="btn-primary">${escapeHtml(branding.ctaText || "Explore Catalog")}</a>
      </div>
    </section>`);
      } else if (sectionId === "featured_products") {
        const productCardsHtml = products
          .map(
            (p) => `
        <article class="product-card">
          <div class="product-thumb" style="background-color: #E2E8F0;">${escapeHtml(p.name.slice(0, 2).toUpperCase())}</div>
          <div class="product-body">
            <div>
              <h3 class="product-name">${escapeHtml(p.name)}</h3>
              <p class="product-desc">${escapeHtml(p.description)}</p>
            </div>
            <div class="product-footer">
              <span class="product-price">$${p.price.toFixed(2)} ${escapeHtml(p.currency)}</span>
              <button class="btn-primary" style="padding: 6px 14px; font-size: 12px;">Add to Bag</button>
            </div>
          </div>
        </article>`
          )
          .join("\n");

        renderedSectionsHtml.push(`
    <!-- CATALOG SECTION -->
    <section id="catalog" class="container">
      <h2 style="font-size: 28px; font-weight: 700; margin-top: 40px;">Featured Collection (${products.length})</h2>
      <div class="product-grid">
        ${productCardsHtml}
      </div>
    </section>`);
      } else if (sectionId === "about") {
        renderedSectionsHtml.push(`
    <!-- ABOUT SECTION -->
    <section class="about-section">
      <div class="container">
        <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">About ${escapeHtml(store.name)}</h2>
        <p style="max-width: 700px; margin: 0 auto; opacity: 0.8; font-size: 15px;">
          ${escapeHtml(branding.aboutText || store.description || `Tailored e-commerce showcase created for ${store.clientName}.`)}
        </p>
      </div>
    </section>`);
      } else if (sectionId === "newsletter") {
        renderedSectionsHtml.push(`
    <!-- NEWSLETTER SECTION -->
    <section class="newsletter-section">
      <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Stay in Touch</h3>
      <p style="font-size: 13px; opacity: 0.75; margin-bottom: 20px;">Subscribe for exclusive collections and updates.</p>
      <form onsubmit="event.preventDefault(); alert('Thank you for subscribing!');" style="display: flex; gap: 8px; justify-content: center;">
        <input type="email" required placeholder="Enter your email" style="padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; flex: 1; max-width: 300px; font-size: 14px;" />
        <button type="submit" class="btn-primary" style="padding: 10px 20px; font-size: 14px;">Subscribe</button>
      </form>
    </section>`);
      } else if (sectionId === "footer") {
        renderedSectionsHtml.push(`
    <!-- FOOTER SECTION -->
    <footer>
      <div class="container">
        <p><strong>${escapeHtml(store.name)}</strong> &bull; Client Showcase for ${escapeHtml(store.clientName)}</p>
        <p style="margin-top: 6px; font-size: 11px;">Generated with GridRetail Platform Engine</p>
      </div>
    </footer>`);
      }
    }

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(store.name)} — Official Demonstration</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="banner-strip">
    <strong>${escapeHtml(store.name)}</strong> &mdash; Demonstration Storefront Pitch for ${escapeHtml(store.clientName)}
  </div>

  <header>
    <div class="brand-title">${escapeHtml(store.name)}</div>
    <nav style="display: flex; gap: 20px; font-size: 14px; font-weight: 500;">
      <a href="#catalog">Catalog</a>
      <a href="#about">About</a>
    </nav>
  </header>

  <main>
    ${renderedSectionsHtml.join("\n")}
  </main>
</body>
</html>
`;

    // 5. Generate README.md
    const readmeContent = `# ${store.name} — Storefront Export Bundle

**Client:** ${store.clientName}  
**Industry:** ${store.industry}  
**Template:** ${template?.name || "Standard Contemporary"}  
**Export Date:** ${manifest.exportTimestamp}  
**GridRetail Version:** 1.0.0  

---

## Bundle Contents

- \`index.html\`: Standalone, responsive HTML5 storefront presentation.
- \`styles.css\`: Custom stylesheet containing branded CSS variables and design tokens.
- \`store-manifest.json\`: Machine-readable metadata, layout configurations, and template settings.
- \`products.json\`: Catalog listing containing ${products.length} product records.

---

## Deployment Instructions

### 1. Static Web Hosting (Vercel, Netlify, Cloudflare Pages)
Drop this unzipped directory directly into your static site hosting provider. No build step or Node.js runtime is required.

### 2. AWS S3 + CloudFront
1. Create an S3 bucket configured for static website hosting.
2. Upload all files (\`index.html\`, \`styles.css\`, \`store-manifest.json\`, \`products.json\`).
3. Set \`index.html\` as the index document.
4. Point a CloudFront distribution to the bucket for global SSL and CDN delivery.

### 3. Nginx / Apache
Copy the unzipped files to your web server root:
\`\`\`bash
cp -r . /var/www/html/${store.slug}/
\`\`\`

---
Generated by GridRetail Export Engine.
`;

    // 6. Build the ZIP Archive using ZipBuilder
    const zipBuilder = new ZipBuilder();
    zipBuilder.addFile("index.html", indexHtml);
    zipBuilder.addFile("styles.css", cssContent);
    zipBuilder.addFile("store-manifest.json", JSON.stringify(manifest, null, 2));
    zipBuilder.addFile("products.json", productsJson);
    zipBuilder.addFile("README.md", readmeContent);

    const buffer = zipBuilder.build();
    const fileSizeBytes = buffer.length;
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const dateStamp = Date.now();
    const artifactName = `${store.slug}-export-${dateStamp}.zip`;
    const storeExportDir = path.join(this.exportDir, store.id);

    await this.ensureDir(storeExportDir);
    const fullFilePath = path.join(storeExportDir, artifactName);
    await fs.writeFile(fullFilePath, buffer);

    const artifactUrl = `/uploads/exports/${store.id}/${artifactName}`;

    return {
      buffer,
      fileSizeBytes,
      checksumSha256,
      artifactName,
      artifactUrl,
      files: ["index.html", "styles.css", "store-manifest.json", "products.json", "README.md"],
    };
  }

  public static async getExportBuffer(storeId: string, artifactName: string): Promise<Buffer | null> {
    try {
      const fullFilePath = path.join(this.exportDir, storeId, path.basename(artifactName));
      return await fs.readFile(fullFilePath);
    } catch {
      return null;
    }
  }
}
