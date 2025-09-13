import fs from "fs";
import path from "path";
import matter from "gray-matter";

// copy recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function migrateContent(hugoContentDir, astroContentDir) {
  if (!fs.existsSync(astroContentDir)) {
    fs.mkdirSync(astroContentDir, { recursive: true });
  }

  for (const file of fs.readdirSync(hugoContentDir)) {
    const filePath = path.join(hugoContentDir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      migrateContent(filePath, path.join(astroContentDir, file));
    } else if (file.endsWith(".md") || file.endsWith(".mdx")) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);

      // Clean Hugo → Astro front matter
      const fm = { ...data };
      if (fm.categories) {
        fm.tags = (fm.tags || []).concat(fm.categories);
        delete fm.categories;
      }
      if (fm.slug) delete fm.slug; // Astro reserves slug

      const newRaw = matter.stringify(content, fm);
      fs.writeFileSync(path.join(astroContentDir, path.basename(file)), newRaw);
    }
  }
}

function migrate(hugoPath) {
  const hugoContent = path.join(hugoPath, "content", "posts");
  const hugoStatic = path.join(hugoPath, "static");
  const astroContent = path.join(process.cwd(), "src", "content", "posts");
  const astroPublic = path.join(process.cwd(), "public");

  console.log("Migrating content...");
  migrateContent(hugoContent, astroContent);

  console.log("Copying static assets...");
  if (fs.existsSync(hugoStatic)) {
    copyDir(hugoStatic, astroPublic);
  }

  console.log("Done!");
}

const hugoPath = process.argv[2];
if (!hugoPath) {
  console.error("Usage: node migrate-hugo-to-astro.mjs ../bundoon-blog");
  process.exit(1);
}
migrate(hugoPath);
